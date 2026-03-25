import Link from 'next/link'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { eq, gte, lte } from 'drizzle-orm'
import { SignalCard } from '../../components/signal-card'

export default async function ThemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ theme: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { theme } = await params
  const { from, to } = await searchParams
  const decodedTheme = decodeURIComponent(theme)

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

  if (from) {
    query = query.where(gte(syntheses.periodEnd, new Date(from)))
  }
  if (to) {
    query = query.where(lte(syntheses.periodEnd, new Date(to)))
  }

  const rows = await query

  const matching = rows.filter(
    (row) => row.themes && row.themes.includes(decodedTheme),
  )

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-accent"
      >
        &larr; Back
      </Link>

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-ink">{decodedTheme}</h2>
        <span className="font-mono text-sm text-muted">
          {matching.length} signal{matching.length !== 1 ? 's' : ''}
        </span>
      </div>

      <form className="flex items-end gap-3">
        <div>
          <label
            htmlFor="from"
            className="block text-xs font-medium uppercase tracking-wider text-dim"
          >
            From
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={from ?? ''}
            className="mt-1.5 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label
            htmlFor="to"
            className="block text-xs font-medium uppercase tracking-wider text-dim"
          >
            To
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={to ?? ''}
            className="mt-1.5 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Filter
        </button>
      </form>

      {matching.length === 0 ? (
        <p className="py-8 text-center text-sm italic text-muted">
          No signals found{from || to ? ' in this date range' : ''}
        </p>
      ) : (
        <div className="space-y-4">
          {matching.map((signal, i) => (
            <div
              key={signal.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <SignalCard signal={signal} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
