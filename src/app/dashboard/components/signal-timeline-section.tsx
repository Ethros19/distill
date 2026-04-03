import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { formatTimeAgo, signalStatusBadge, signalStatusLabel } from './format-utils'

function strengthColor(strength: number): string {
  if (strength >= 5) return 'var(--signal-high)'
  if (strength >= 3) return 'var(--signal-mid)'
  return 'var(--signal-low)'
}

function strengthLabel(strength: number): string {
  if (strength >= 5) return 'high priority'
  if (strength >= 3) return 'medium'
  return 'positive'
}

function strengthBadgeStyle(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

export async function SignalTimelineSection() {
  const timelineSignals = await db
    .select({
      id: signals.id,
      statement: signals.statement,
      reasoning: signals.reasoning,
      strength: signals.strength,
      status: signals.status,
      themes: signals.themes,
      synthesisDate: syntheses.createdAt,
    })
    .from(signals)
    .innerJoin(syntheses, eq(signals.synthesisId, syntheses.id))
    .orderBy(desc(signals.strength), desc(syntheses.createdAt))
    .limit(8)

  const highCount = timelineSignals.filter((s) => s.strength >= 5).length

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl text-ink">Active Signals</h3>
        {timelineSignals.length > 0 && (
          <span className="text-xs font-mono text-muted">
            {timelineSignals.length} signals{highCount > 0 ? ` · ${highCount} high strength` : ''}
          </span>
        )}
      </div>

      {timelineSignals.length === 0 ? (
        <div className="card-elevated rounded-xl border border-edge bg-panel px-5 py-8">
          <p className="text-center text-xs italic text-muted">
            Signals will appear here after your first synthesis.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {timelineSignals.map((signal) => (
            <Link
              key={signal.id}
              href={`/dashboard/signals/${signal.id}`}
              className="card-elevated flex items-start gap-4 rounded-xl border border-edge bg-panel px-5 py-4 transition-colors hover:border-accent/20"
            >
              {/* Strength column */}
              <div className="mt-1 flex flex-col items-center gap-1">
                <span
                  className="font-mono text-lg font-bold"
                  style={{ color: strengthColor(signal.strength) }}
                >
                  {signal.strength}
                </span>
                <div className="strength-bar w-8">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(signal.strength / 10) * 100}%`,
                      backgroundColor: strengthColor(signal.strength),
                    }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-ink">
                  {signal.statement}
                </p>
                {signal.reasoning && (
                  <p className="mt-1.5 text-xs leading-relaxed text-dim line-clamp-2">
                    {signal.reasoning}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${strengthBadgeStyle(signal.strength)}`}>
                    {strengthLabel(signal.strength)}
                  </span>
                  {signal.themes?.slice(0, 3).map((theme) => (
                    <span
                      key={theme}
                      className="rounded bg-panel-alt px-2 py-0.5 text-[11px] text-muted"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="shrink-0 text-right">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${signalStatusBadge(signal.status)}`}>
                  {signalStatusLabel(signal.status)}
                </span>
                <p className="mt-1 text-[10px] text-muted" suppressHydrationWarning>
                  {formatTimeAgo(signal.synthesisDate)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
