import { db } from '@/lib/db'
import { signals, inputs } from '@/lib/schema'
import { count, gte, sql, desc } from 'drizzle-orm'
import { STREAM_LABELS } from '@/lib/stream-utils'
import { MetricCard } from './metric-card'

export async function MetricCardsSection() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    signalAggResult,
    themeCountResult,
    [{ value: inputVelocity }],
    topStreamRow,
  ] = await Promise.all([
    // Signal counts + strength distribution in one query
    db.execute(sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE strength >= 5)::int AS high,
        count(*) FILTER (WHERE strength >= 3 AND strength < 5)::int AS mid,
        count(*) FILTER (WHERE strength < 3)::int AS low
      FROM signals
    `),
    // Active Themes count via subquery
    db.execute(sql`
      SELECT count(*)::int AS value FROM (
        SELECT DISTINCT jsonb_array_elements_text(themes) AS theme
        FROM signals
        WHERE themes IS NOT NULL AND jsonb_array_length(themes) > 0
      ) t
    `),
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

  const signalAgg = (signalAggResult as unknown as { rows: Array<{ total: number; high: number; mid: number; low: number }> }).rows[0]
  const { total: totalSignals, high, mid, low } = signalAgg

  const activeThemes = (themeCountResult as unknown as { rows: Array<{ value: number }> }).rows[0].value

  const topStreamRaw = topStreamRow[0]?.stream ?? null
  const topStreamLabel = topStreamRaw
    ? (STREAM_LABELS[topStreamRaw] ?? topStreamRaw)
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
