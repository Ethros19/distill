export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, signals, SIGNAL_STATUSES } from '@/lib/schema'
import { eq, desc, gte, lt, and } from 'drizzle-orm'
import Link from 'next/link'
import { SignalCard } from '../components/signal-card'
import { periodLabels, startOfPeriod, endOfPeriod } from '../lib/periods'
import { signalStatusLabel } from '../components/format-utils'
import { StatusFilterTabs } from '../components/status-filter-tabs'

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string }>
}) {
  const { period, status } = await searchParams
  const isFiltered = period && period in periodLabels
  const validStatus = status && (SIGNAL_STATUSES as readonly string[]).includes(status)
    ? (status as (typeof SIGNAL_STATUSES)[number])
    : undefined

  const [latest] = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  let signalRows: (typeof signals.$inferSelect)[]

  if (isFiltered) {
    const since = startOfPeriod(period)
    const until = endOfPeriod(period)
    const conditions = []
    if (since) conditions.push(gte(syntheses.periodEnd, since))
    if (until) conditions.push(lt(syntheses.periodEnd, until))
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
        linearIssueUrl: signals.linearIssueUrl,
        notes: signals.notes,
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
        <h1 className="font-display text-lg font-semibold text-ink">
          Signals
        </h1>
        <p className="mt-1 text-sm text-muted">
          {signalRows.length === 0
            ? 'No signals yet.'
            : `${signalRows.length} signal${signalRows.length === 1 ? '' : 's'} detected.`}
        </p>
      </div>

      {(latest || isFiltered) && (
        <div className="space-y-4">
          <div
            className="animate-fade-up flex items-center gap-3"
            style={{ animationDelay: '100ms' }}
          >
            {isFiltered && (
              <>
                <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-medium text-accent">
                  {periodLabels[period]}
                </span>
                <Link
                  href="/dashboard/signals"
                  className="text-xs text-muted transition-colors hover:text-ink"
                >
                  Clear
                </Link>
              </>
            )}
          </div>

          <div
            className="animate-fade-up"
            style={{ animationDelay: '120ms' }}
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
                style={{ animationDelay: `${140 + i * 60}ms` }}
              >
                <SignalCard signal={signal} />
              </div>
            ))
          ) : (
            <div
              className="animate-fade-up py-8 text-center"
              style={{ animationDelay: '140ms' }}
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
    </div>
  )
}
