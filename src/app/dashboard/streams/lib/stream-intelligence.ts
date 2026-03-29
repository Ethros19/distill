import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql, desc, gte, eq, and } from 'drizzle-orm'
import { STREAM_VALUES } from '@/lib/stream-utils'
import type { StreamVolume, StreamTheme, StreamArticle, StreamIntelligenceData } from './types'

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

  // Build a map for O(1) lookup, then ensure every canonical stream appears
  const countMap = new Map<string, number>()
  for (const row of rows) {
    if (row.stream) countMap.set(row.stream, row.count)
  }

  return STREAM_VALUES.map((stream) => ({
    stream,
    count: countMap.get(stream) ?? 0,
  }))
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

  return (rows as unknown as StreamTheme[]).filter((r) => r.stream !== null)
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
 * Execute volume, themes, and articles queries in parallel.
 * Returns a single StreamIntelligenceData object for the streams dashboard.
 */
export async function getStreamIntelligence(
  windowDays = 30,
): Promise<StreamIntelligenceData> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const [volume, themes, articles] = await Promise.all([
    queryStreamVolume(since),
    queryStreamThemes(since),
    queryTopArticles(since),
  ])

  return { volume, themes, articles }
}
