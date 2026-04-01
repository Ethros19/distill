import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql, desc, gte, eq, and } from 'drizzle-orm'
import { getStreams } from '@/lib/stream-config'
import type { StreamVolume, StreamTheme, StreamArticle, StreamIntelligenceData, CrossStreamTheme, TrendDirection } from './types'

// ---------------------------------------------------------------------------
// Trend direction helper
// ---------------------------------------------------------------------------

export function trendDirection(current: number, prior: number): TrendDirection {
  if (prior === 0 && current === 0) return 'stable'
  if (prior === 0) return 'rising'
  const ratio = current / prior
  if (ratio > 1.2) return 'rising'
  if (ratio < 0.8) return 'falling'
  return 'stable'
}

// ---------------------------------------------------------------------------
// Per-stream volume aggregation
// ---------------------------------------------------------------------------

/**
 * Count inputs per stream, excluding feedback. Streams with zero inputs
 * get a zero-count entry so charts always show all streams.
 */
export async function queryStreamVolume(since: Date): Promise<StreamVolume[]> {
  const rows = await db
    .select({
      stream: inputs.stream,
      count: sql<number>`count(*)::int`,
    })
    .from(inputs)
    .where(and(eq(inputs.isFeedback, false), gte(inputs.createdAt, since)))
    .groupBy(inputs.stream)
    .orderBy(desc(sql`count(*)`))

  const streamConfigs = await getStreams()

  // Build a map for O(1) lookup, then ensure every canonical stream appears
  const countMap = new Map<string, number>()
  for (const row of rows) {
    if (row.stream) countMap.set(row.stream, row.count)
  }

  return streamConfigs.map(({ id: stream }) => ({
    stream,
    count: countMap.get(stream) ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Per-stream volume with trend (current vs prior half-window)
// ---------------------------------------------------------------------------

/**
 * Split the window in half — current period vs prior period — and compute
 * per-stream counts for both. Returns StreamVolume[] with priorCount and trend.
 * Minimum count guard: if current+prior < 5, mark as 'stable'.
 */
export async function queryStreamTrend(windowDays: number): Promise<StreamVolume[]> {
  const now = Date.now()
  const halfWindow = Math.floor(windowDays / 2)
  const currentStart = new Date(now - halfWindow * 24 * 60 * 60 * 1000)
  const priorStart = new Date(now - windowDays * 24 * 60 * 60 * 1000)

  const rows = await db.execute(sql`
    SELECT
      stream,
      sum(CASE WHEN created_at >= ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS current_count,
      sum(CASE WHEN created_at >= ${priorStart.toISOString()} AND created_at < ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS prior_count
    FROM inputs
    WHERE is_feedback = false
      AND created_at >= ${priorStart.toISOString()}
      AND stream IS NOT NULL
    GROUP BY stream
  `)

  const streamConfigs = await getStreams()

  const countMap = new Map<string, { current: number; prior: number }>()
  for (const row of (rows as unknown as { rows: Array<{ stream: string; current_count: number; prior_count: number }> }).rows) {
    if (row.stream) {
      countMap.set(row.stream, { current: row.current_count, prior: row.prior_count })
    }
  }

  return streamConfigs.map(({ id: stream }) => {
    const data = countMap.get(stream)
    const current = data?.current ?? 0
    const prior = data?.prior ?? 0
    const total = current + prior
    return {
      stream,
      count: current + prior,
      priorCount: prior,
      trend: total < 5 ? 'stable' as TrendDirection : trendDirection(current, prior),
    }
  })
}

// ---------------------------------------------------------------------------
// Cross-stream themes (themes appearing in 2+ streams)
// ---------------------------------------------------------------------------

/**
 * Unnest JSONB themes, group by normalized theme, count distinct streams.
 * Returns themes appearing in 2+ streams, ordered by stream_count then total_freq.
 */
export async function queryCrossStreamThemes(since: Date): Promise<CrossStreamTheme[]> {
  const rows = await db.execute(sql`
    SELECT
      lower(replace(jsonb_array_elements_text(themes), '_', ' ')) AS theme,
      count(DISTINCT stream)::int AS stream_count,
      count(*)::int AS total_freq,
      array_agg(DISTINCT stream) AS streams
    FROM inputs
    WHERE is_feedback = false
      AND themes IS NOT NULL
      AND jsonb_array_length(themes) > 0
      AND created_at >= ${since.toISOString()}
      AND stream IS NOT NULL
    GROUP BY lower(replace(jsonb_array_elements_text(themes), '_', ' '))
    HAVING count(DISTINCT stream) >= 2
    ORDER BY stream_count DESC, total_freq DESC
    LIMIT 10
  `)

  return ((rows as unknown as { rows: Array<{ theme: string; stream_count: number; total_freq: number; streams: string[] }> }).rows).map(
    (row) => ({
      theme: row.theme,
      streamCount: row.stream_count,
      totalFreq: row.total_freq,
      streams: row.streams,
    }),
  )
}

// ---------------------------------------------------------------------------
// Top-N themes per stream (with normalization)
// ---------------------------------------------------------------------------

/**
 * Unnest JSONB themes array, normalize (lowercase + underscore→space),
 * count per stream, then return top 5 per stream via rank() window function.
 */
export async function queryStreamThemes(since: Date): Promise<StreamTheme[]> {
  const rows = await db.execute(sql`
    SELECT stream, theme, freq::int AS freq
    FROM (
      SELECT
        stream,
        lower(replace(jsonb_array_elements_text(themes), '_', ' ')) AS theme,
        count(*)::int AS freq,
        rank() OVER (PARTITION BY stream ORDER BY count(*) DESC) AS rn
      FROM inputs
      WHERE is_feedback = false
        AND themes IS NOT NULL
        AND jsonb_array_length(themes) > 0
        AND created_at >= ${since.toISOString()}
      GROUP BY stream, lower(replace(jsonb_array_elements_text(themes), '_', ' '))
    ) ranked
    WHERE rn <= 5
    ORDER BY stream, freq DESC
  `)

  return ((rows as unknown as { rows: StreamTheme[] }).rows).filter((r) => r.stream !== null)
}

// ---------------------------------------------------------------------------
// Top articles per stream (high urgency, recent)
// ---------------------------------------------------------------------------

/**
 * Fetch the most notable recent articles across all streams:
 * non-feedback, urgency >= 4, ordered by urgency then recency.
 */
export async function queryTopArticles(since: Date): Promise<StreamArticle[]> {
  const rows = await db
    .select({
      id: inputs.id,
      stream: inputs.stream,
      summary: inputs.summary,
      urgency: inputs.urgency,
      createdAt: inputs.createdAt,
      feedUrl: inputs.feedUrl,
    })
    .from(inputs)
    .where(
      and(
        eq(inputs.isFeedback, false),
        gte(inputs.urgency, 4),
        gte(inputs.createdAt, since),
      ),
    )
    .orderBy(desc(inputs.urgency), desc(inputs.createdAt))
    .limit(30)

  return rows
}

// ---------------------------------------------------------------------------
// Composite: all stream intelligence in parallel
// ---------------------------------------------------------------------------

/**
 * Execute volume, themes, articles, and cross-stream queries in parallel.
 * Returns a single StreamIntelligenceData object for the streams dashboard.
 */
export async function getStreamIntelligence(
  windowDays = 30,
): Promise<StreamIntelligenceData> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const [volume, themes, articles, crossStreamThemes] = await Promise.all([
    queryStreamTrend(windowDays),
    queryStreamThemes(since),
    queryTopArticles(since),
    queryCrossStreamThemes(since),
  ])

  return { volume, themes, articles, crossStreamThemes }
}
