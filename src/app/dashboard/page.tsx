export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, inputs } from '@/lib/schema'
import { eq, desc, and, gt, count } from 'drizzle-orm'
import { DashboardIntelligence } from './components/dashboard-intelligence'
import { SetupChecklist, getSetupStatus, isSetupComplete } from './components/setup-checklist'
import { SynthesisHeader } from './components/synthesis-header'

export default async function DashboardPage() {
  const [[latest], [{ value: unprocessedCount }], setupStatus] = await Promise.all([
    db
      .select()
      .from(syntheses)
      .orderBy(desc(syntheses.createdAt))
      .limit(1),
    db
      .select({ value: count() })
      .from(inputs)
      .where(eq(inputs.status, 'unprocessed')),
    getSetupStatus(),
  ])

  const [{ value: unsynthesizedCount }] = latest
    ? await db
        .select({ value: count() })
        .from(inputs)
        .where(and(eq(inputs.status, 'processed'), gt(inputs.createdAt, latest.createdAt)))
    : [{ value: 0 }]

  const setupComplete = isSetupComplete(setupStatus)

  return (
    <div className="space-y-6">
      {!setupComplete && (
        <div className="animate-fade-up">
          <SetupChecklist status={setupStatus} />
        </div>
      )}

      {/* Hero: Synthesis Narrative */}
      <div className="animate-fade-up" style={{ animationDelay: setupComplete ? '0ms' : '80ms' }}>
        <SynthesisHeader
          synthesis={latest ?? null}
          unprocessedCount={unprocessedCount}
          unsynthesizedCount={unsynthesizedCount}
        />
      </div>

      {/* Intelligence sections */}
      <div className="animate-fade-up" style={{ animationDelay: setupComplete ? '80ms' : '160ms' }}>
        <DashboardIntelligence />
      </div>
    </div>
  )
}
