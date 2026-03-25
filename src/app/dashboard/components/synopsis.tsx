import type { Signal } from '@/lib/schema'

export function Synopsis({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null

  const sorted = [...signals].sort((a, b) => b.strength - a.strength)
  const top = sorted.slice(0, 3)
  const high = signals.filter((s) => s.strength >= 5).length
  const mid = signals.filter((s) => s.strength >= 3 && s.strength < 5).length
  const low = signals.filter((s) => s.strength < 3).length

  const allThemes = new Set(signals.flatMap((s) => s.themes ?? []))

  return (
    <div className="rounded-xl border border-edge bg-panel/60 px-6 py-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-dim">
        Synopsis
      </h3>

      <ul className="mt-3 space-y-2">
        {top.map((signal, i) => (
          <li key={signal.id} className="flex gap-3 text-sm">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                signal.strength >= 5
                  ? 'bg-sig-high'
                  : signal.strength >= 3
                    ? 'bg-sig-mid'
                    : 'bg-sig-low'
              }`}
            />
            <span className={i === 0 ? 'text-ink' : 'text-dim'}>
              {signal.statement}
            </span>
          </li>
        ))}
      </ul>

      {signals.length > 3 && (
        <p className="mt-3 text-xs text-muted">
          +{signals.length - 3} more signal{signals.length - 3 !== 1 ? 's' : ''}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge-dim pt-3 text-xs text-muted">
        {high > 0 && (
          <span>
            <span className="font-mono font-medium text-sig-high">{high}</span> high
          </span>
        )}
        {mid > 0 && (
          <span>
            <span className="font-mono font-medium text-sig-mid">{mid}</span> mid
          </span>
        )}
        {low > 0 && (
          <span>
            <span className="font-mono font-medium text-sig-low">{low}</span> low
          </span>
        )}
        {allThemes.size > 0 && (
          <>
            <span className="text-edge">|</span>
            <span>
              across{' '}
              <span className="font-mono font-medium text-dim">
                {allThemes.size}
              </span>{' '}
              theme{allThemes.size !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
