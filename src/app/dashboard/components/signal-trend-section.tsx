import { db } from '@/lib/db'
import { syntheses } from '@/lib/schema'
import { asc } from 'drizzle-orm'
import { SignalTrendChart } from './charts/signal-trend-chart'

export async function SignalTrendSection() {
  const rows = await db
    .select({
      createdAt: syntheses.createdAt,
      signalCount: syntheses.signalCount,
    })
    .from(syntheses)
    .orderBy(asc(syntheses.createdAt))
    .limit(24)

  const data = rows.map((row) => ({
    date: new Date(row.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    count: row.signalCount,
  }))

  return (
    <div className="card-elevated flex h-full flex-col rounded-xl border border-edge bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold text-dim">Signal Trend</h3>
      <div className="min-h-0 flex-1">
        <SignalTrendChart data={data} />
      </div>
    </div>
  )
}
