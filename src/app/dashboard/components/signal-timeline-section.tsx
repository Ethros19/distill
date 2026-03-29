import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { formatTimeAgo, signalStatusBadge, signalStatusLabel } from './format-utils'

function strengthDotColor(strength: number): string {
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
    .limit(15)

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-semibold text-dim">Signal Timeline</h3>

      {timelineSignals.length === 0 ? (
        <p className="mt-4 text-xs italic text-muted">
          Signals will appear here after your first synthesis.
        </p>
      ) : (
        <ol className="relative mt-4 ml-3 border-l border-edge-dim">
          {timelineSignals.map((signal) => (
            <li key={signal.id} className="mb-4 ml-5">
              <span
                className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-edge ${strengthDotColor(signal.strength)}`}
              />
              <time className="text-xs text-muted">
                {formatTimeAgo(signal.synthesisDate)}
              </time>
              <p className="mt-0.5 text-sm leading-snug text-ink line-clamp-2">
                {signal.statement}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${signalStatusBadge(signal.status)}`}
              >
                {signalStatusLabel(signal.status)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
