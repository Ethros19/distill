import Link from 'next/link'
import { db } from '@/lib/db'
import { signals } from '@/lib/schema'
import { aggregateThemes } from './theme-sidebar'

/**
 * Theme Landscape — a readable, clickable tag cloud visualization.
 * Themes scale in size by frequency, all link to their detail page.
 */
export async function ThemeHeatmapSection() {
  const allSignals = await db
    .select({ themes: signals.themes })
    .from(signals)

  const themes = aggregateThemes(allSignals).slice(0, 30)
  const maxCount = themes.length > 0 ? themes[0].count : 0

  function tier(count: number): 'lg' | 'md' | 'sm' {
    if (maxCount === 0) return 'sm'
    const ratio = count / maxCount
    if (ratio > 0.55) return 'lg'
    if (ratio > 0.25) return 'md'
    return 'sm'
  }

  const tierStyles = {
    lg: 'text-[15px] font-semibold px-4 py-2.5 leading-snug',
    md: 'text-[13px] font-medium px-3 py-2 leading-snug',
    sm: 'text-xs font-medium px-2.5 py-1.5',
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-semibold text-dim">Theme Landscape</h3>

      {themes.length === 0 ? (
        <p className="mt-4 text-xs italic text-muted">
          No themes detected yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {themes.map((theme, i) => {
            const t = tier(theme.count)
            const intensity =
              maxCount > 0
                ? Math.round((theme.count / maxCount) * 45) + 12
                : 12

            return (
              <Link
                key={theme.name}
                href={`/dashboard/themes/${encodeURIComponent(theme.name)}`}
                className={`animate-fade-up group relative inline-flex items-center gap-2 rounded-lg text-ink transition-all hover:shadow-sm hover:ring-1 hover:ring-accent/30 ${tierStyles[t]}`}
                style={{
                  animationDelay: `${i * 30}ms`,
                  background: `color-mix(in srgb, var(--accent) ${intensity}%, var(--surface-raised))`,
                }}
              >
                <span className="transition-colors group-hover:text-accent">
                  {theme.name}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted transition-colors group-hover:text-accent/70">
                  {theme.count}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
