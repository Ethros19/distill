export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, inputs } from '@/lib/schema'
import { eq, desc, and, gt, count } from 'drizzle-orm'
import { DashboardIntelligence } from './components/dashboard-intelligence'

export default async function DashboardPage() {
  const [[latest], [{ value: unprocessedCount }]] = await Promise.all([
    db
      .select()
      .from(syntheses)
      .orderBy(desc(syntheses.createdAt))
      .limit(1),
    db
      .select({ value: count() })
      .from(inputs)
      .where(eq(inputs.status, 'unprocessed')),
  ])

  const [{ value: unsynthesizedCount }] = latest
    ? await db
        .select({ value: count() })
        .from(inputs)
        .where(and(eq(inputs.status, 'processed'), gt(inputs.createdAt, latest.createdAt)))
    : [{ value: 0 }]

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display text-lg font-semibold text-ink">
          Intelligence Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real-time synthesis of signals, themes, and input streams.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <DashboardIntelligence
          synthesis={latest ?? null}
          unprocessedCount={unprocessedCount}
          unsynthesizedCount={unsynthesizedCount}
        />
      </div>
    </div>
  )
}
