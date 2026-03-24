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

  if (themes.length === 0) {
    return (
      <aside className="w-64 shrink-0">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Themes
          </h3>
          <p className="mt-2 text-xs text-gray-500">No themes detected yet</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 shrink-0">
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Themes
        </h3>
        <ul className="mt-3 space-y-1">
          {themes.map((theme) => (
            <li key={theme.name}>
              <Link
                href={`/dashboard/themes/${encodeURIComponent(theme.name)}`}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {theme.name}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {theme.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
