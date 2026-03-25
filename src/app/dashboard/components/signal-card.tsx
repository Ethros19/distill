import type { Signal } from '@/lib/schema'

export function strengthColor(strength: number): string {
  if (strength >= 5) return 'border-l-sig-high'
  if (strength >= 3) return 'border-l-sig-mid'
  return 'border-l-sig-low'
}

function strengthBadge(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div
      className={`rounded-xl border border-edge border-l-[3px] bg-panel p-5 ${strengthColor(signal.strength)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug text-ink">
          {signal.statement}
        </h3>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${strengthBadge(signal.strength)}`}
        >
          {signal.strength}
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-dim">
        {signal.reasoning}
      </p>

      <p className="mt-2.5 text-xs text-muted">
        {signal.evidence.length} supporting input
        {signal.evidence.length !== 1 ? 's' : ''}
      </p>

      {signal.suggestedAction && (
        <div className="mt-3 flex gap-2 text-sm text-accent">
          <span className="shrink-0">&rarr;</span>
          <span>{signal.suggestedAction}</span>
        </div>
      )}

      {signal.themes && signal.themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {signal.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-panel-alt px-2.5 py-0.5 text-[11px] font-medium text-dim"
            >
              {theme}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
