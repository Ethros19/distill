import { db } from '@/lib/db'
import { feedSources, inputs } from '@/lib/schema'
import { eq, count, sql } from 'drizzle-orm'
import { getStreams, deriveStreamMaps, hexFromStreams } from '@/lib/stream-config'

export async function StreamCoverageGrid() {
  const streamConfigs = await getStreams()
  const { values: STREAM_VALUES, labels: STREAM_LABELS, categoryMap: CATEGORY_TO_STREAM } = deriveStreamMaps(streamConfigs)

  // Query enabled source counts by category and input counts by stream in parallel
  const [categoryCounts, streamInputCounts] = await Promise.all([
    db
      .select({
        category: feedSources.category,
        sourceCount: count(),
      })
      .from(feedSources)
      .where(eq(feedSources.enabled, true))
      .groupBy(feedSources.category),
    db
      .select({
        stream: inputs.stream,
        inputCount: count(),
      })
      .from(inputs)
      .where(sql`${inputs.stream} IS NOT NULL`)
      .groupBy(inputs.stream),
  ])

  // Aggregate source counts by stream using CATEGORY_TO_STREAM mapping
  const sourcesByStream: Record<string, number> = {}
  for (const row of categoryCounts) {
    if (!row.category) continue
    const stream = CATEGORY_TO_STREAM[row.category]
    if (!stream) continue
    sourcesByStream[stream] = (sourcesByStream[stream] || 0) + row.sourceCount
  }

  // Build input count lookup
  const inputsByStream: Record<string, number> = {}
  for (const row of streamInputCounts) {
    if (row.stream) {
      inputsByStream[row.stream] = row.inputCount
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {STREAM_VALUES.map((stream) => {
        const sourceCount = sourcesByStream[stream] || 0
        const inputCount = inputsByStream[stream] || 0
        const hex = hexFromStreams(streamConfigs, stream)

        return (
          <div
            key={stream}
            className="flex items-start gap-2 rounded-md border border-edge bg-panel-alt/50 px-3 py-2"
          >
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: hex }}>
                {STREAM_LABELS[stream]}
              </p>
              {sourceCount > 0 ? (
                <>
                  <p className="text-xs text-dim">
                    {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
                  </p>
                  <p className="text-xs text-muted">
                    {inputCount.toLocaleString()} {inputCount === 1 ? 'input' : 'inputs'}
                  </p>
                </>
              ) : stream === 'product' ? (
                <p className="text-xs text-muted italic">Feedback only</p>
              ) : (
                <p className="text-xs text-sig-mid">No sources</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
