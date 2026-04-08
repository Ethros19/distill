import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { asc, eq, sql } from 'drizzle-orm'
import { SignalTrendChart } from './charts/signal-trend-chart'

export async function SignalTrendSection() {
  // Get the last 24 syntheses
  const runs = await db
    .select({
      id: syntheses.id,
      createdAt: syntheses.createdAt,
    })
    .from(syntheses)
    .orderBy(asc(syntheses.createdAt))
    .limit(24)

  if (runs.length === 0) {
    return (
      <div className="card-elevated flex h-full flex-col rounded-xl border border-edge bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold text-dim">Signal Strength Over Time</h3>
        <p className="py-8 text-center text-sm italic text-muted">
          No synthesis data yet.
        </p>
      </div>
    )
  }

  // Count signals by strength bucket per synthesis
  const strengthRows = await db
    .select({
      synthesisId: signals.synthesisId,
      strength: signals.strength,
      count: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(
      sql`${signals.synthesisId} IN (${sql.join(
        runs.map((r) => sql`${r.id}`),
        sql`, `,
      )})`,
    )
    .groupBy(signals.synthesisId, signals.strength)

  // Build a map: synthesisId -> { high, mid, low }
  const buckets = new Map<string, { high: number; mid: number; low: number }>()
  for (const row of strengthRows) {
    if (!buckets.has(row.synthesisId)) {
      buckets.set(row.synthesisId, { high: 0, mid: 0, low: 0 })
    }
    const b = buckets.get(row.synthesisId)!
    if (row.strength >= 5) b.high += row.count
    else if (row.strength >= 3) b.mid += row.count
    else b.low += row.count
  }

  // Deduplicate date labels — append run index when multiple per day
  const dateCounts = new Map<string, number>()
  const data = runs.map((run) => {
    const b = buckets.get(run.id) ?? { high: 0, mid: 0, low: 0 }
    const dayLabel = new Date(run.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const idx = (dateCounts.get(dayLabel) ?? 0) + 1
    dateCounts.set(dayLabel, idx)
    return {
      date: idx > 1 ? `${dayLabel} #${idx}` : dayLabel,
      high: b.high,
      mid: b.mid,
      low: b.low,
    }
  })

  // Back-patch first occurrence when a day has multiple runs
  for (const entry of data) {
    const base = entry.date.replace(/ #\d+$/, '')
    if ((dateCounts.get(base) ?? 0) > 1 && !entry.date.includes('#')) {
      entry.date = `${base} #1`
    }
  }

  return (
    <div className="card-elevated flex flex-col rounded-xl border border-edge bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold text-dim">Signal Strength Over Time</h3>
      <div className="h-64">
        <SignalTrendChart data={data} />
      </div>
    </div>
  )
}
