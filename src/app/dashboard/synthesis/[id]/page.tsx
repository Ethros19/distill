export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Synthesis Detail | Distill',
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = new Date(start).toLocaleDateString('en-US', opts)
  const endStr = new Date(end).toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })
  return `${startStr} \u2013 ${endStr}`
}

function NarrativeProse({ markdown }: { markdown: string }) {
  const html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hp])(.+)/gm, '<p>$1</p>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>(<h3>)/g, '$1')
    .replace(/(<\/h3>)<\/p>/g, '$1')

  return (
    <div
      className="narrative-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function strengthBadge(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

function strengthLabel(strength: number): string {
  if (strength >= 5) return 'High'
  if (strength >= 3) return 'Medium'
  return 'Low'
}

export default async function SynthesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [synthesis] = await db
    .select()
    .from(syntheses)
    .where(eq(syntheses.id, id))

  if (!synthesis) notFound()

  const signalRows = await db
    .select()
    .from(signals)
    .where(eq(signals.synthesisId, id))
    .orderBy(desc(signals.strength))

  const dateRange = formatDateRange(synthesis.periodStart, synthesis.periodEnd)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl italic text-dim">
            Synthesis: {dateRange}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted">
            <span>{synthesis.signalCount} signals</span>
            <span>&middot;</span>
            <span>{synthesis.inputCount} inputs</span>
            <span>&middot;</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                synthesis.trigger === 'manual'
                  ? 'bg-accent-wash text-accent'
                  : 'bg-panel-alt text-dim'
              }`}
            >
              {synthesis.trigger}
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/synthesis"
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
        >
          All Syntheses
        </Link>
      </div>

      {/* Narrative */}
      {synthesis.digestMarkdown && (
        <div className="card-elevated rounded-xl border border-edge bg-panel p-6">
          <NarrativeProse markdown={synthesis.digestMarkdown} />
        </div>
      )}

      {/* Signals */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-dim">
          Signals ({signalRows.length})
        </h3>
        {signalRows.map((signal) => (
          <Link
            key={signal.id}
            href={`/dashboard/signals/${signal.id}`}
            className="card-elevated group block rounded-xl border border-edge bg-panel p-4 transition-all hover:border-accent/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink group-hover:text-accent">
                {signal.statement}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${strengthBadge(signal.strength)}`}
              >
                {strengthLabel(signal.strength)}
              </span>
            </div>
            {signal.themes && signal.themes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {signal.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-md bg-panel-alt px-2 py-0.5 text-[11px] text-muted"
                  >
                    {theme.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
