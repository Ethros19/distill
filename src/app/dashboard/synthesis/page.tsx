export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import { syntheses } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Synthesis History | Distill',
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

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default async function SynthesisHistoryPage() {
  const runs = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl italic text-dim">
            Synthesis History
          </h2>
          <p className="mt-1 text-sm text-muted">
            {runs.length} synthesis run{runs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
        >
          Back to Dashboard
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="card-elevated rounded-xl border border-edge bg-panel p-8 text-center">
          <p className="text-sm italic text-muted">No synthesis runs yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => {
            const isLatest = i === 0
            return (
              <Link
                key={run.id}
                href={`/dashboard/synthesis/${run.id}`}
                className="card-elevated group block rounded-xl border border-edge bg-panel p-5 transition-all hover:border-accent/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isLatest && (
                      <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                    )}
                    <h3 className="text-sm font-semibold text-ink">
                      {formatDateRange(run.periodStart, run.periodEnd)}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        run.trigger === 'manual'
                          ? 'bg-accent-wash text-accent'
                          : 'bg-panel-alt text-dim'
                      }`}
                    >
                      {run.trigger}
                    </span>
                    {isLatest && (
                      <span className="rounded-full bg-accent-wash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                        Latest
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted" suppressHydrationWarning>
                    {formatRelativeTime(run.createdAt)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-dim">
                    <strong className="font-mono text-ink">{run.signalCount}</strong> signals
                  </span>
                  <span className="text-dim">
                    <strong className="font-mono text-ink">{run.inputCount}</strong> inputs
                  </span>
                </div>

                {run.digestMarkdown && (
                  <p className="mt-2 line-clamp-2 text-sm text-dim">
                    {run.digestMarkdown.replace(/[#*_]/g, '').slice(0, 200)}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
