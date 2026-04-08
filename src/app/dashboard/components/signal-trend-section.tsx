import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { asc, sql } from 'drizzle-orm'
import { SignalTrendChart } from './charts/signal-trend-chart'

export async function SignalTrendSection() {
  // Get the last 24 syntheses
  const runs = await db
    .select({
      id: syntheses.id,
      createdAt: syntheses.createdAt,
    })
    .from(syntheses)
    .orderBy(asc(syntheses.createdAt))
    .limit(24)

  if (runs.length === 0) {
    return (
      <div className="card-elevated flex flex-col rounded-xl border border-edge bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold text-dim">Signal Trends</h3>
        <p className="py-8 text-center text-sm italic text-muted">
          No synthesis data yet.
        </p>
      </div>
    )
  }

  // Unnest themes per signal per synthesis — count each theme per synthesis run
  const themeRows = await db.execute(sql`
    SELECT
      s.synthesis_id,
      jsonb_array_elements_text(s.themes) AS theme,
      count(*)::int AS count
    FROM signals s
    WHERE s.synthesis_id IN (${sql.join(
      runs.map((r) => sql`${r.id}`),
      sql`, `,
    )})
      AND s.themes IS NOT NULL
      AND jsonb_array_length(s.themes) > 0
    GROUP BY s.synthesis_id, jsonb_array_elements_text(s.themes)
  `) as unknown as {
    rows: Array<{ synthesis_id: string; theme: string; count: number }>
  }

  // Find the top 8 themes by total frequency across all runs
  const themeTotals = new Map<string, number>()
  for (const row of themeRows.rows) {
    themeTotals.set(row.theme, (themeTotals.get(row.theme) ?? 0) + row.count)
  }
  const topThemes = [...themeTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme]) => theme)

  // Build per-synthesis theme counts
  const themeMap = new Map<string, Map<string, number>>()
  for (const row of themeRows.rows) {
    if (!topThemes.includes(row.theme)) continue
    if (!themeMap.has(row.synthesis_id)) {
      themeMap.set(row.synthesis_id, new Map())
    }
    themeMap.get(row.synthesis_id)!.set(row.theme, row.count)
  }

  // Deduplicate date labels
  const dateCounts = new Map<string, number>()
  const data = runs.map((run) => {
    const dayLabel = new Date(run.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const idx = (dateCounts.get(dayLabel) ?? 0) + 1
    dateCounts.set(dayLabel, idx)

    const point: Record<string, string | number> = {
      date: idx > 1 ? `${dayLabel} #${idx}` : dayLabel,
    }
    const synthThemes = themeMap.get(run.id)
    for (const theme of topThemes) {
      point[theme] = synthThemes?.get(theme) ?? 0
    }
    return point
  })

  // Back-patch first occurrence when a day has multiple runs
  for (const entry of data) {
    const base = (entry.date as string).replace(/ #\d+$/, '')
    if ((dateCounts.get(base) ?? 0) > 1 && !(entry.date as string).includes('#')) {
      entry.date = `${base} #1`
    }
  }

  return (
    <div className="card-elevated flex flex-col rounded-xl border border-edge bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold text-dim">Signal Trends</h3>
      <div className="h-72">
        <SignalTrendChart data={data} themes={topThemes} />
      </div>
    </div>
  )
}
