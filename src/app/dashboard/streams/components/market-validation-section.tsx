import Link from 'next/link'
import { STREAM_BG_COLORS, STREAM_LABELS, type Stream } from '@/lib/stream-utils'
import type { MarketValidation } from '../lib/types'

function strengthBadge(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

export function MarketValidationSection({
  validations,
}: {
  validations: MarketValidation[]
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg italic text-dim">
          Market Validation
        </h2>
        <p className="mt-1 text-xs text-muted">
          Signals confirmed by cross-stream industry trends
        </p>
      </div>

      {validations.length === 0 ? (
        <div className="rounded-xl border border-edge bg-panel p-5">
          <p className="py-4 text-center text-sm italic text-muted">
            No market-validated signals in the current synthesis period.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {validations.slice(0, 10).map((v) => (
            <div
              key={v.signalId}
              className="rounded-xl border border-edge bg-panel p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/dashboard/signals/${v.signalId}`}
                  className="font-medium leading-snug text-ink hover:text-accent transition-colors"
                >
                  {v.signalStatement}
                </Link>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${strengthBadge(v.signalStrength)}`}
                >
                  {v.signalStrength}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted">Validated by:</span>
                  {v.validatingThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted">Echoed across:</span>
                  {v.matchingStreams.map((stream) => (
                    <span
                      key={stream}
                      className="inline-flex items-center gap-1.5 rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium text-dim"
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${STREAM_BG_COLORS[stream] ?? 'bg-muted'}`}
                      />
                      {STREAM_LABELS[stream as Stream] ?? stream}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
