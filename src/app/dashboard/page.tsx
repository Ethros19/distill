import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { SynthesisHeader } from './components/synthesis-header'
import { SignalCard } from './components/signal-card'

export default async function DashboardPage() {
  const [latest] = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  const signalRows = latest
    ? await db
        .select()
        .from(signals)
        .where(eq(signals.synthesisId, latest.id))
        .orderBy(desc(signals.strength))
    : []

  return (
    <div className="space-y-6">
      <SynthesisHeader synthesis={latest ?? null} />

      {signalRows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Signals
          </h2>
          {signalRows.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </div>
  )
}
