import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql, desc, gte, eq, and } from 'drizzle-orm'
import { STREAM_VALUES } from '@/lib/stream-utils'
import type { StreamVolume } from './types'

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
