import Link from 'next/link'
import { db } from '@/lib/db'
import { signals } from '@/lib/schema'
import { sql } from 'drizzle-orm'

export async function ThemeHeatmapSection() {
  // Aggregate themes directly in SQL instead of fetching all signal rows
  const rows = await db.execute(sql`
    SELECT
      jsonb_array_elements_text(themes) AS theme,
      count(*)::int AS count
    FROM signals
    WHERE themes IS NOT NULL AND jsonb_array_length(themes) > 0
    GROUP BY jsonb_array_elements_text(themes)
    ORDER BY count DESC
    LIMIT 40
  `) as unknown as { rows: Array<{ theme: string; count: number }> }

  const themes = rows.rows
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
    <div className="flex flex-col rounded-xl border border-edge bg-panel">
      {/* Fixed header */}
      <div className="flex items-center justify-between border-b border-edge-dim px-5 py-3">
        <h3 className="text-sm font-semibold text-dim">Theme Landscape</h3>
        {themes.length > 0 && (
          <span className="rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
            {themes.length}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      {themes.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-center text-xs italic text-muted">
            No themes detected yet.
          </p>
        </div>
      ) : (
        <div className="intel-scroll max-h-[420px] overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {themes.map((theme, i) => {
              const t = tier(theme.count)
              const intensity =
                maxCount > 0
                  ? Math.round((theme.count / maxCount) * 45) + 12
                  : 12

              return (
                <Link
                  key={theme.theme}
                  href={`/dashboard/themes/${encodeURIComponent(theme.theme)}`}
                  className={`animate-fade-up group inline-flex items-center gap-2 rounded-lg text-ink transition-all hover:shadow-sm hover:ring-1 hover:ring-accent/30 ${tierStyles[t]}`}
                  style={{
                    animationDelay: `${i * 25}ms`,
                    background: `color-mix(in srgb, var(--accent) ${intensity}%, var(--surface-raised))`,
                  }}
                >
                  <span className="transition-colors group-hover:text-accent">
                    {theme.theme}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted transition-colors group-hover:text-accent/70">
                    {theme.count}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
