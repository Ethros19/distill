import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { formatTimeAgo, signalStatusBadge, signalStatusLabel } from './format-utils'

function strengthDot(strength: number): string {
  if (strength >= 5) return 'bg-sig-high'
  if (strength >= 3) return 'bg-sig-mid'
  return 'bg-sig-low'
}

export async function SignalTimelineSection() {
  const timelineSignals = await db
    .select({
      id: signals.id,
      statement: signals.statement,
      strength: signals.strength,
      status: signals.status,
      synthesisDate: syntheses.createdAt,
    })
    .from(signals)
    .innerJoin(syntheses, eq(signals.synthesisId, syntheses.id))
    .orderBy(desc(syntheses.createdAt), desc(signals.strength))
    .limit(20)

  return (
    <div className="flex h-full flex-col rounded-xl border border-edge bg-panel">
      {/* Fixed header */}
      <div className="flex items-center justify-between border-b border-edge-dim px-5 py-3">
        <h3 className="text-sm font-semibold text-dim">Signal Timeline</h3>
        {timelineSignals.length > 0 && (
          <span className="rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
            {timelineSignals.length}
          </span>
        )}
      </div>

      {/* Scrollable feed */}
      {timelineSignals.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-center text-xs italic text-muted">
            Signals will appear here after your first synthesis.
          </p>
        </div>
      ) : (
        <div className="intel-scroll max-h-[420px] overflow-y-auto">
          {timelineSignals.map((signal, i) => (
            <div
              key={signal.id}
              className={`flex gap-3 px-5 py-3 transition-colors hover:bg-panel-alt/50 ${
                i < timelineSignals.length - 1 ? 'border-b border-edge-dim' : ''
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${strengthDot(signal.strength)}`}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/signals/${signal.id}`}
                  className="text-sm leading-snug text-ink transition-colors hover:text-accent line-clamp-2"
                >
                  {signal.statement}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${signalStatusBadge(signal.status)}`}
                  >
                    {signalStatusLabel(signal.status)}
                  </span>
                  <span className="text-[10px] text-muted" suppressHydrationWarning>
                    {formatTimeAgo(signal.synthesisDate)}
                  </span>
                </div>
              </div>
              <span className="mt-0.5 font-mono text-[11px] font-medium text-muted">
                {signal.strength}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
