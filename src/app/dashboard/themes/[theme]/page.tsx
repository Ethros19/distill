export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { eq, gte, desc } from 'drizzle-orm'
import { SignalCard } from '../../components/signal-card'
import { Synopsis } from '../../components/synopsis'
import { periodLabels, startOfPeriod } from '../../lib/periods'

export default async function ThemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ theme: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { theme } = await params
  const { period } = await searchParams
  const decodedTheme = decodeURIComponent(theme)
  const isFiltered = period && period in periodLabels

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

  if (isFiltered) {
    const since = startOfPeriod(period)
    if (since) {
      query = query.where(gte(syntheses.periodEnd, since))
    }
  }

  const rows = await query.orderBy(desc(signals.strength))

  const matching = rows.filter(
    (row) => row.themes && row.themes.includes(decodedTheme),
  )

  return (
    <div className="space-y-6">
      <Link
        href={period ? `/dashboard?period=${period}` : '/dashboard'}
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-accent"
      >
        &larr; Back
      </Link>

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-ink">{decodedTheme}</h2>
        <div className="flex items-center gap-3">
          {isFiltered && (
            <>
              <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-medium text-accent">
                {periodLabels[period]}
              </span>
              <Link
                href={`/dashboard/themes/${encodeURIComponent(decodedTheme)}`}
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                Clear
              </Link>
            </>
          )}
          <span className="font-mono text-sm text-muted">
            {matching.length} signal{matching.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {matching.length > 0 && (
        <div className="animate-fade-up">
          <Synopsis signals={matching} />
        </div>
      )}

      {matching.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-muted">
          No signals found{isFiltered ? ` for ${periodLabels[period].toLowerCase()}` : ''}
        </p>
      ) : (
        <div className="space-y-4">
          {matching.map((signal, i) => (
            <div
              key={signal.id}
              className="animate-fade-up"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <SignalCard signal={signal} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
