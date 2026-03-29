import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql, desc, gte, eq, and } from 'drizzle-orm'
import { STREAM_VALUES } from '@/lib/stream-utils'
import type { StreamVolume, StreamTheme } from './types'

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
