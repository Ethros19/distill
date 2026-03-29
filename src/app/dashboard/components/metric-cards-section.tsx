import { db } from '@/lib/db'
import { signals, inputs } from '@/lib/schema'
import { count, gte, sql, desc } from 'drizzle-orm'
import { STREAM_LABELS, type Stream } from '@/lib/stream-utils'
import { MetricCard } from './metric-card'
import { aggregateThemes } from './theme-sidebar'

export async function MetricCardsSection() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    [{ value: totalSignals }],
    allSignalThemes,
    [{ value: inputVelocity }],
    topStreamRow,
  ] = await Promise.all([
    // Total Signals
    db.select({ value: count() }).from(signals),
    // Active Themes + strength data (fetch both to avoid extra query)
    db.select({ themes: signals.themes, strength: signals.strength }).from(signals),
    // Input Velocity (7d)
    db
      .select({ value: count() })
      .from(inputs)
      .where(gte(inputs.createdAt, sevenDaysAgo)),
    // Top Stream
    db
      .select({
        stream: inputs.stream,
        streamCount: count(),
      })
      .from(inputs)
      .groupBy(inputs.stream)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
  ])

  const activeThemes = aggregateThemes(allSignalThemes).length

  // Strength distribution: high (>=5), mid (>=3), low (<3)
  let high = 0, mid = 0, low = 0
  for (const row of allSignalThemes) {
    if (row.strength >= 5) high++
    else if (row.strength >= 3) mid++
    else low++
  }

  const topStreamRaw = topStreamRow[0]?.stream ?? null
  const topStreamLabel = topStreamRaw
    ? (STREAM_LABELS[topStreamRaw as Stream] ?? topStreamRaw)
    : totalSignals === 0 && inputVelocity === 0
      ? 'None'
      : 'Untagged'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Signals" value={totalSignals} />
        <MetricCard label="Active Themes" value={activeThemes} />
        <MetricCard label="Input Velocity" value={inputVelocity} suffix=" /7d" />
        <MetricCard label="Top Stream" value={topStreamLabel} />
      </div>
      {totalSignals > 0 && (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
          <div className="bg-sig-high" style={{ width: `${(high / totalSignals) * 100}%` }} />
          <div className="bg-sig-mid" style={{ width: `${(mid / totalSignals) * 100}%` }} />
          <div className="bg-sig-low" style={{ width: `${(low / totalSignals) * 100}%` }} />
        </div>
      )}
    </div>
  )
}
