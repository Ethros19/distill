export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { eq, desc, gte } from 'drizzle-orm'
import Link from 'next/link'
import { SynthesisHeader } from './components/synthesis-header'
import { SignalCard } from './components/signal-card'
import { TriggerButton } from './components/trigger-button'
import { InputsFeed } from './components/inputs-feed'

const periodLabels: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  total: 'All Time',
}

function startOfPeriod(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(now.getFullYear(), now.getMonth(), diff)
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
    case 'total':
      return null
    default:
      return null
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period } = await searchParams
  const isFiltered = period && period in periodLabels

  const [latest] = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  let signalRows: (typeof signals.$inferSelect)[]

  if (isFiltered) {
    const since = startOfPeriod(period)
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
      })
      .from(signals)
      .innerJoin(syntheses, eq(signals.synthesisId, syntheses.id))
      .$dynamic()

    if (since) {
      query = query.where(gte(syntheses.createdAt, since))
    }

    signalRows = await query.orderBy(desc(signals.strength))
  } else {
    signalRows = latest
      ? await db
          .select()
          .from(signals)
          .where(eq(signals.synthesisId, latest.id))
          .orderBy(desc(signals.strength))
      : []
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <SynthesisHeader
          synthesis={latest ?? null}
          action={<TriggerButton />}
        />
      </div>

      {signalRows.length > 0 && (
        <div className="space-y-4">
          <div
            className="animate-fade-up flex items-center gap-3"
            style={{ animationDelay: '80ms' }}
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
          {signalRows.map((signal, i) => (
            <div
              key={signal.id}
              className="animate-fade-up"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              <SignalCard signal={signal} />
            </div>
          ))}
        </div>
      )}

      {signalRows.length === 0 && (
        <div
          className="animate-fade-up py-8 text-center"
          style={{ animationDelay: '80ms' }}
        >
          {isFiltered ? (
            <p className="text-sm italic text-muted">
              No signals found for {periodLabels[period].toLowerCase()}.
            </p>
          ) : latest ? (
            <p className="text-sm italic text-muted">
              No signals detected in this synthesis.
            </p>
          ) : (
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
          )}
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
