export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, signals, inputs } from '@/lib/schema'
import { eq, desc, and, gt, count, sql } from 'drizzle-orm'
import { DashboardIntelligence } from './components/dashboard-intelligence'
import { SetupChecklist, getSetupStatus, isSetupComplete } from './components/setup-checklist'
import { SynthesisHeader } from './components/synthesis-header'
import { formatRelativeTime } from './components/synthesis-header'

export default async function DashboardPage() {
  const [[latest], [{ value: unprocessedCount }], [{ value: totalSignals }], setupStatus] = await Promise.all([
    db
      .select()
      .from(syntheses)
      .orderBy(desc(syntheses.createdAt))
      .limit(1),
    db
      .select({ value: count() })
      .from(inputs)
      .where(eq(inputs.status, 'unprocessed')),
    db
      .select({ value: count() })
      .from(signals),
    getSetupStatus(),
  ])

  const highStrength = latest
    ? await db
        .select({ value: count() })
        .from(signals)
        .where(eq(signals.synthesisId, latest.id))
        .then(([r]) => r.value)
    : 0

  const [{ value: unsynthesizedCount }] = latest
    ? await db
        .select({ value: count() })
        .from(inputs)
        .where(and(eq(inputs.status, 'processed'), gt(inputs.createdAt, latest.createdAt)))
    : [{ value: 0 }]

  const setupComplete = isSetupComplete(setupStatus)
  const lastSynthesisLabel = latest
    ? `Last synthesis: ${formatRelativeTime(latest.createdAt)}`
    : 'No synthesis yet'

  return (
    <div className="space-y-6">
      {!setupComplete && (
        <div className="animate-fade-up">
          <SetupChecklist status={setupStatus} />
        </div>
      )}

      {/* Page title */}
      <div className="animate-fade-up flex items-end justify-between" style={{ animationDelay: setupComplete ? '0ms' : '80ms' }}>
        <div>
          <h2 className="font-display text-3xl text-ink">Intelligence Overview</h2>
          <p className="mt-1 text-sm text-dim">
            {lastSynthesisLabel} &middot; {totalSignals} signals active
          </p>
        </div>
      </div>

      {/* Hero: Synthesis Narrative */}
      <div className="animate-fade-up" style={{ animationDelay: setupComplete ? '60ms' : '140ms' }}>
        <SynthesisHeader
          synthesis={latest ?? null}
          unprocessedCount={unprocessedCount}
          unsynthesizedCount={unsynthesizedCount}
        />
      </div>

      {/* Intelligence sections */}
      <div className="animate-fade-up" style={{ animationDelay: setupComplete ? '120ms' : '200ms' }}>
        <DashboardIntelligence />
      </div>
    </div>
  )
}
