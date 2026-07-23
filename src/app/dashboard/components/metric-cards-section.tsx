import { db } from '@/lib/db'
import { signals, inputs } from '@/lib/schema'
import { count, gte, eq, desc, sql } from 'drizzle-orm'
import { STREAM_LABELS } from '@/lib/stream-utils'

export async function MetricCardsSection() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    [{ value: inputVelocity }],
    themeResult,
    topStreamRow,
    [{ value: unprocessedCount }],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(inputs)
      .where(gte(inputs.createdAt, sevenDaysAgo)),
    db.execute(sql`
      SELECT count(*)::int AS value FROM (
        SELECT DISTINCT jsonb_array_elements_text(themes) AS theme
        FROM signals
        WHERE themes IS NOT NULL AND jsonb_array_length(themes) > 0
      ) t
    `),
    db
      .select({ stream: inputs.stream, streamCount: count() })
      .from(inputs)
      .groupBy(inputs.stream)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
    db
      .select({ value: count() })
      .from(inputs)
      .where(eq(inputs.status, 'unprocessed')),
  ])

  const themeCount = (themeResult as unknown as { rows: Array<{ value: number }> }).rows?.[0]?.value ?? 0

  const topStreamRaw = topStreamRow[0]?.stream ?? null
  const topStreamLabel = topStreamRaw
    ? (STREAM_LABELS[topStreamRaw] ?? topStreamRaw)
    : 'None'

  const metrics = [
    { label: 'Inputs This Week', value: String(inputVelocity) },
    { label: 'Active Themes', value: String(themeCount) },
    { label: 'Top Stream', value: topStreamLabel },
    { label: 'Unprocessed', value: String(unprocessedCount), highlight: unprocessedCount > 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="card-elevated rounded-xl border border-edge bg-panel px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {m.label}
          </p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${
            m.highlight ? 'text-gold' : 'text-ink'
          }`}>
            {m.value}
          </p>
        </div>
      ))}
    </div>
  )
}
