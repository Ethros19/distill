import { db } from '@/lib/db'
import { signals } from '@/lib/schema'
import { aggregateThemes } from './theme-sidebar'

export async function ThemeHeatmapSection() {
  const allSignals = await db
    .select({ themes: signals.themes })
    .from(signals)

  const themes = aggregateThemes(allSignals).slice(0, 24)
  const maxCount = themes.length > 0 ? themes[0].count : 0

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-semibold text-dim">Theme Landscape</h3>

      {themes.length === 0 ? (
        <p className="mt-4 text-xs italic text-muted">
          No themes detected yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1.5">
          {themes.map((theme) => {
            const intensity =
              maxCount > 0
                ? Math.round((theme.count / maxCount) * 60) + 10
                : 10

            return (
              <div
                key={theme.name}
                className="relative rounded-lg p-2.5 text-xs font-medium text-ink truncate"
                style={{
                  background: `color-mix(in srgb, var(--accent) ${intensity}%, var(--surface))`,
                }}
              >
                {theme.name}
                <span className="absolute right-1.5 top-1.5 text-[10px] text-muted">
                  {theme.count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
