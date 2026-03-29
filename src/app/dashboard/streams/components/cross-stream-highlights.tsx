import { STREAM_BG_COLORS, STREAM_LABELS, type Stream } from '@/lib/stream-utils'
import type { CrossStreamTheme } from '../lib/types'

export function CrossStreamHighlights({
  themes,
}: {
  themes: CrossStreamTheme[]
}) {
  if (themes.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="font-display text-xl italic text-dim">
          Cross-Stream Signals
        </h3>
        <p className="py-6 text-center text-sm italic text-muted">
          No themes appearing across multiple streams yet.
        </p>
      </div>
    )
  }

  const maxFreq = themes.reduce((max, t) => Math.max(max, t.totalFreq), 0)

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-display text-xl italic text-dim">
          Cross-Stream Signals
        </h3>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {themes.length}
        </span>
      </div>

      <div className="space-y-3">
        {themes.map((t) => (
          <div key={t.theme} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">{t.theme}</span>
              <span className="rounded-full bg-panel-alt px-2.5 py-0.5 text-xs font-medium text-dim">
                {t.streamCount} streams
              </span>
            </div>

            {/* Frequency bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/20">
              <div
                className="h-full rounded-full bg-accent/40 transition-all"
                style={{ width: `${(t.totalFreq / maxFreq) * 100}%` }}
              />
            </div>

            {/* Stream pills */}
            <div className="flex flex-wrap gap-1.5">
              {t.streams.map((stream) => (
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
        ))}
      </div>
    </div>
  )
}
