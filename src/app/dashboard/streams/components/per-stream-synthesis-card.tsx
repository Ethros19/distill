import Link from 'next/link'
import { STREAM_LABELS, streamHex } from '@/lib/stream-utils'
import type { PerStreamSynthesis } from '../lib/types'

function strengthBadge(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

function urgencyBadge(urgency: number): string {
  if (urgency >= 4) return 'bg-sig-high/10 text-sig-high'
  if (urgency >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

export function PerStreamSynthesisCard({
  data,
}: {
  data: PerStreamSynthesis
}) {
  const label = STREAM_LABELS[data.stream] ?? data.stream
  const hex = streamHex(data.stream)
  const maxSignals = 3
  const maxArticles = 3
  const maxThemes = 5

  return (
    <div
      className="rounded-xl border border-edge border-t-2 bg-panel p-4"
      style={{ borderTopColor: hex }}
    >
      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-ink">{label}</h3>
        <span className="rounded-full bg-panel-alt px-2.5 py-0.5 text-xs font-medium text-dim">
          {data.industryInputCount} input{data.industryInputCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Connected Signals */}
      {data.connectedSignals.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Connected Signals
          </p>
          <div className="space-y-1.5">
            {data.connectedSignals.slice(0, maxSignals).map((signal) => (
              <div key={signal.id} className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${strengthBadge(signal.strength)}`}
                >
                  {signal.strength}
                </span>
                <Link
                  href={`/dashboard/signals/${signal.id}`}
                  className="truncate text-xs text-ink hover:text-accent transition-colors"
                >
                  {signal.statement}
                </Link>
              </div>
            ))}
            {data.connectedSignals.length > maxSignals && (
              <p className="text-[11px] text-muted">
                and {data.connectedSignals.length - maxSignals} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Industry Context */}
      {data.topIndustryInputs.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Industry Context
          </p>
          <div className="space-y-1.5">
            {data.topIndustryInputs.slice(0, maxArticles).map((input) => (
              <div key={input.id} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${urgencyBadge(input.urgency)}`}
                >
                  {input.urgency}
                </span>
                <p className="text-xs leading-snug text-dim">
                  {input.summary.length > 120
                    ? `${input.summary.slice(0, 120)}...`
                    : input.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Themes */}
      {data.topThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.topThemes.slice(0, maxThemes).map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-panel-alt px-2.5 py-0.5 text-[11px] font-medium text-dim"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {data.connectedSignals.length === 0 &&
        data.topIndustryInputs.length === 0 && (
          <p className="py-3 text-center text-xs italic text-muted">
            No synthesis connections yet
          </p>
        )}
    </div>
  )
}
