import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql } from 'drizzle-orm'
import { STREAM_VALUES, STREAM_LABELS, type Stream } from '@/lib/stream-utils'
import { trendDirection } from '../../streams/lib/stream-intelligence'
import type { TrendDirection } from '../../streams/lib/types'

export interface RadarArticle {
  id: string
  summary: string | null
  feedUrl: string | null
  urgency: number | null
  createdAt: Date
}

export interface StreamBrief {
  stream: Stream
  label: string
  trend: TrendDirection
  inputCount: number
  priorCount: number
  topThemes: string[]
  articles: RadarArticle[]
}

/**
 * Fetch per-stream intelligence briefs: volume/trend, top themes, top 5 articles.
 * All three queries run in parallel for performance.
 */
export async function getRadarData(windowDays = 14): Promise<StreamBrief[]> {
  const now = Date.now()
  const halfWindow = Math.floor(windowDays / 2)
  const currentStart = new Date(now - halfWindow * 24 * 60 * 60 * 1000)
  const priorStart = new Date(now - windowDays * 24 * 60 * 60 * 1000)
  const since = priorStart

  const [volumeResult, themeResult, articleResult] = await Promise.all([
    // Volume + trend per stream
    db.execute(sql`
      SELECT
        stream,
        sum(CASE WHEN created_at >= ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS current_count,
        sum(CASE WHEN created_at < ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS prior_count
      FROM inputs
      WHERE is_feedback = false
        AND created_at >= ${since.toISOString()}
        AND stream IS NOT NULL
      GROUP BY stream
    `),

    // Top 5 themes per stream
    db.execute(sql`
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
    `),

    // Top 5 articles per stream (by urgency then recency)
    db.execute(sql`
      SELECT id, stream, summary, feed_url, urgency, created_at
      FROM (
        SELECT
          id, stream, summary, feed_url, urgency, created_at,
          row_number() OVER (
            PARTITION BY stream
            ORDER BY urgency DESC NULLS LAST, created_at DESC
          ) AS rn
        FROM inputs
        WHERE is_feedback = false
          AND summary IS NOT NULL
          AND created_at >= ${since.toISOString()}
          AND stream IS NOT NULL
      ) ranked
      WHERE rn <= 5
      ORDER BY stream, rn
    `),
  ])

  // Build lookup maps
  const volumeMap = new Map<string, { current: number; prior: number }>()
  for (const row of (volumeResult as unknown as { rows: Array<{ stream: string; current_count: number; prior_count: number }> }).rows) {
    if (row.stream) volumeMap.set(row.stream, { current: row.current_count, prior: row.prior_count })
  }

  const themeMap = new Map<string, string[]>()
  for (const row of (themeResult as unknown as { rows: Array<{ stream: string; theme: string; freq: number }> }).rows) {
    if (!row.stream) continue
    const arr = themeMap.get(row.stream) ?? []
    arr.push(row.theme)
    themeMap.set(row.stream, arr)
  }

  const articleMap = new Map<string, RadarArticle[]>()
  for (const row of (articleResult as unknown as { rows: Array<{ id: string; stream: string; summary: string | null; feed_url: string | null; urgency: number | null; created_at: string }> }).rows) {
    if (!row.stream) continue
    const arr = articleMap.get(row.stream) ?? []
    arr.push({
      id: row.id,
      summary: row.summary,
      feedUrl: row.feed_url,
      urgency: row.urgency,
      createdAt: new Date(row.created_at),
    })
    articleMap.set(row.stream, arr)
  }

  return STREAM_VALUES.map((stream) => {
    const vol = volumeMap.get(stream)
    const current = vol?.current ?? 0
    const prior = vol?.prior ?? 0
    const total = current + prior

    return {
      stream,
      label: STREAM_LABELS[stream],
      trend: total < 5 ? ('stable' as TrendDirection) : trendDirection(current, prior),
      inputCount: total,
      priorCount: prior,
      topThemes: themeMap.get(stream) ?? [],
      articles: articleMap.get(stream) ?? [],
    }
  })
}
