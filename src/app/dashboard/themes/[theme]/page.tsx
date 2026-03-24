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

  // Query signals joined with syntheses for date filtering
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

  // Filter to signals containing this theme
  const matching = rows.filter(
    (row) => row.themes && row.themes.includes(decodedTheme),
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Theme: {decodedTheme}
        </h2>
        <span className="text-sm text-gray-500">
          {matching.length} signal{matching.length !== 1 ? 's' : ''}
        </span>
      </div>

      <form className="flex items-end gap-3">
        <div>
          <label
            htmlFor="from"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            From
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={from ?? ''}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label
            htmlFor="to"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            To
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={to ?? ''}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Filter
        </button>
      </form>

      {matching.length === 0 ? (
        <p className="text-sm text-gray-500">
          No signals found for this theme
          {from || to ? ' in the selected date range' : ''}.
        </p>
      ) : (
        <div className="space-y-4">
          {matching.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </div>
  )
}
