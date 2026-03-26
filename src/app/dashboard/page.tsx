export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, signals, inputs, SIGNAL_STATUSES } from '@/lib/schema'
import { eq, desc, gte, gt, and, count } from 'drizzle-orm'
import Link from 'next/link'
import { SynthesisHeader } from './components/synthesis-header'
import { SignalCard } from './components/signal-card'
import { Synopsis } from './components/synopsis'
import { TriggerButton } from './components/trigger-button'
import { InputsFeed } from './components/inputs-feed'
import { periodLabels, startOfPeriod } from './lib/periods'
import { signalStatusLabel } from './components/format-utils'
import { StatusFilterTabs } from './components/status-filter-tabs'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string }>
}) {
  const { period, status } = await searchParams
  const isFiltered = period && period in periodLabels
  const validStatus = status && (SIGNAL_STATUSES as readonly string[]).includes(status)
    ? (status as (typeof SIGNAL_STATUSES)[number])
    : undefined

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

  // Count processed inputs that arrived after the latest synthesis (ready for next run)
  const [{ value: unsynthesizedCount }] = latest
    ? await db
        .select({ value: count() })
        .from(inputs)
        .where(and(eq(inputs.status, 'processed'), gt(inputs.createdAt, latest.createdAt)))
    : [{ value: 0 }]

  let signalRows: (typeof signals.$inferSelect)[]

  if (isFiltered) {
    const since = startOfPeriod(period)
    const conditions = []
    if (since) conditions.push(gte(syntheses.createdAt, since))
    if (validStatus) conditions.push(eq(signals.status, validStatus))

    let query = db
      .select({
        id: signals.id,
        synthesisId: signals.synthesisId,
        statement: signals.statement,
        reasoning: signals.reasoning,
        evidence: signals.evidence,
        suggestedAction: signals.suggestedAction,
        themes: signals.themes,
        strength: signals.strength,
        status: signals.status,
      })
      .from(signals)
      .innerJoin(syntheses, eq(signals.synthesisId, syntheses.id))
      .$dynamic()

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    signalRows = await query.orderBy(desc(signals.strength))
  } else {
    if (latest) {
      const conditions = [eq(signals.synthesisId, latest.id)]
      if (validStatus) conditions.push(eq(signals.status, validStatus))

      signalRows = await db
        .select()
        .from(signals)
        .where(and(...conditions))
        .orderBy(desc(signals.strength))
    } else {
      signalRows = []
    }
  }

  const statusTabs = [
    { label: 'All', value: null as string | null },
    ...SIGNAL_STATUSES.map((s) => ({ label: signalStatusLabel(s), value: s as string | null })),
  ]

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <SynthesisHeader
          synthesis={latest ?? null}
          unprocessedCount={unprocessedCount}
          unsynthesizedCount={unsynthesizedCount}
          action={<TriggerButton />}
        />
      </div>

      {signalRows.length > 0 && (
        <div
          className="animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <Synopsis signals={signalRows} />
        </div>
      )}

      {(latest || isFiltered) && (
        <div className="space-y-4">
          <div
            className="animate-fade-up flex items-center gap-3"
            style={{ animationDelay: '140ms' }}
          >
            <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
              Signals
            </h2>
            {isFiltered && (
              <>
                <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-medium text-accent">
                  {periodLabels[period]}
                </span>
                <Link
                  href="/dashboard"
                  className="text-xs text-muted transition-colors hover:text-ink"
                >
                  Clear
                </Link>
              </>
            )}
          </div>

          {/* Status filter tabs (persisted via localStorage) */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            <StatusFilterTabs
              tabs={statusTabs}
              activeStatus={validStatus}
              period={isFiltered ? period : undefined}
            />
          </div>

          {signalRows.length > 0 ? (
            signalRows.map((signal, i) => (
              <div
                key={signal.id}
                className="animate-fade-up"
                style={{ animationDelay: `${180 + i * 60}ms` }}
              >
                <SignalCard signal={signal} />
              </div>
            ))
          ) : (
            <div
              className="animate-fade-up py-8 text-center"
              style={{ animationDelay: '180ms' }}
            >
              <p className="text-sm italic text-muted">
                {validStatus
                  ? 'No signals with this status.'
                  : isFiltered
                    ? `No signals found for ${periodLabels[period].toLowerCase()}.`
                    : 'No signals detected in this synthesis.'}
              </p>
            </div>
          )}
        </div>
      )}

      {!latest && !isFiltered && (
        <div
          className="animate-fade-up py-8 text-center"
          style={{ animationDelay: '80ms' }}
        >
          <div className="mx-auto max-w-md space-y-4">
            <p className="font-display text-lg italic text-ink">
              Welcome to Distill
            </p>
            <p className="text-sm text-dim">
              Add feedback from your team using the{' '}
              <span className="font-medium text-ink">+ Add Feedback</span>{' '}
              button, then run a synthesis to surface the signals that matter.
            </p>
            <ol className="space-y-2 text-left text-sm text-muted">
              <li className="flex gap-2">
                <span className="font-medium text-accent">1.</span>
                Paste customer quotes, support tickets, or team observations
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent">2.</span>
                Click <span className="font-medium text-ink">Run Synthesis</span> to
                distill patterns
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent">3.</span>
                Review signals ranked by strength and evidence
              </li>
            </ol>
          </div>
        </div>
      )}

      <div
        className="animate-fade-up"
        style={{ animationDelay: `${signalRows.length > 0 ? 120 + signalRows.length * 60 + 60 : 160}ms` }}
      >
        <InputsFeed />
      </div>
    </div>
  )
}
