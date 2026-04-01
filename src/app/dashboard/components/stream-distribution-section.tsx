import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { count } from 'drizzle-orm'
import { STREAM_LABELS, streamHex } from '@/lib/stream-utils'

function label(stream: string): string {
  if (stream in STREAM_LABELS) return STREAM_LABELS[stream]
  return stream
}

export async function StreamDistributionSection() {
  const rows = await db
    .select({
      stream: inputs.stream,
      count: count(),
    })
    .from(inputs)
    .groupBy(inputs.stream)

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold text-dim">Input Streams</h3>
        <p className="py-8 text-center text-sm italic text-muted">
          No inputs recorded yet.
        </p>
      </div>
    )
  }

  const segments = rows.map((row) => ({
    key: row.stream ?? 'Untagged',
    count: row.count,
  }))

  const total = segments.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold text-dim">Input Streams</h3>

      {/* Stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="transition-all"
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: seg.key === 'Untagged' ? 'var(--dim)' : streamHex(seg.key),
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.key === 'Untagged' ? 'var(--muted)' : streamHex(seg.key) }}
            />
            <span className="truncate text-dim">{label(seg.key)}</span>
            <span className="ml-auto font-medium text-ink">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
