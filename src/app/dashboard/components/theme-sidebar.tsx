import Link from 'next/link'
import { db } from '@/lib/db'
import { signals } from '@/lib/schema'

export function aggregateThemes(
  rows: { themes: string[] | null }[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.themes) {
      for (const theme of row.themes) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1)
      }
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export async function ThemeSidebar() {
  const allSignals = await db
    .select({ themes: signals.themes })
    .from(signals)

  const themes = aggregateThemes(allSignals)
  const maxCount = themes.length > 0 ? themes[0].count : 0

  return (
    <aside className="w-60 shrink-0">
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
          Themes
        </h3>
        {themes.length === 0 ? (
          <p className="mt-4 text-xs italic text-muted">
            No themes detected yet
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {themes.map((theme) => (
              <li key={theme.name}>
                <Link
                  href={`/dashboard/themes/${encodeURIComponent(theme.name)}`}
                  className="group block rounded-lg px-2.5 py-2 transition-colors hover:bg-panel-alt"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink transition-colors group-hover:text-accent">
                      {theme.name}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {theme.count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge-dim">
                    <div
                      className="h-full rounded-full bg-accent/40 transition-all group-hover:bg-accent/60"
                      style={{ width: `${(theme.count / maxCount) * 100}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
