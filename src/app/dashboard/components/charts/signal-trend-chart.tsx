'use client'

interface HeatmapProps {
  data: Array<Record<string, string | number>>
  themes: string[]
}

export function SignalTrendChart({ data, themes }: HeatmapProps) {
  if (data.length < 2 || themes.length === 0) {
    return (
      <p className="py-8 text-center text-sm italic text-muted">
        Trend data will appear after multiple synthesis runs.
      </p>
    )
  }

  // Find the max count across all cells for color scaling
  let maxCount = 0
  for (const point of data) {
    for (const theme of themes) {
      const val = (point[theme] as number) ?? 0
      if (val > maxCount) maxCount = val
    }
  }

  function cellColor(count: number): string {
    if (count === 0) return 'var(--surface-raised)'
    const ratio = maxCount > 0 ? count / maxCount : 0
    // Map to accent opacity: low counts = faint wash, high counts = vivid
    const opacity = 0.15 + ratio * 0.7
    return `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, var(--surface-raised))`
  }

  function cellTextColor(count: number): string {
    if (count === 0) return 'var(--text-muted)'
    const ratio = maxCount > 0 ? count / maxCount : 0
    return ratio > 0.5 ? '#fff' : 'var(--fg)'
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Grid */}
      <div className="intel-scroll min-h-0 flex-1 overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: data.length * 52 + 140 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-panel px-3 py-1.5 text-left text-[11px] font-medium text-muted" />
              {data.map((point, i) => (
                <th
                  key={i}
                  className="px-1 py-1.5 text-center text-[10px] font-normal text-muted"
                  style={{ minWidth: 48 }}
                >
                  {point.date as string}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {themes.map((theme) => (
              <tr key={theme} className="group">
                <td className="sticky left-0 z-10 bg-panel pr-3 py-0.5 text-right text-[11px] font-medium text-dim transition-colors group-hover:text-ink">
                  <span className="inline-block max-w-[130px] truncate">
                    {theme.replace(/_/g, ' ')}
                  </span>
                </td>
                {data.map((point, i) => {
                  const count = (point[theme] as number) ?? 0
                  return (
                    <td key={i} className="px-0.5 py-0.5">
                      <div
                        className="flex h-7 items-center justify-center rounded-[5px] text-[11px] font-medium tabular-nums transition-all hover:ring-1 hover:ring-accent/40"
                        style={{
                          background: cellColor(count),
                          color: cellTextColor(count),
                        }}
                        title={`${theme.replace(/_/g, ' ')}: ${count} signal${count !== 1 ? 's' : ''} (${point.date})`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scale legend */}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
        <span>Fewer</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div
              key={ratio}
              className="h-3 w-5 rounded-sm"
              style={{
                background:
                  ratio === 0
                    ? 'var(--surface-raised)'
                    : `color-mix(in srgb, var(--accent) ${Math.round((0.15 + ratio * 0.7) * 100)}%, var(--surface-raised))`,
              }}
            />
          ))}
        </div>
        <span>More signals</span>
      </div>
    </div>
  )
}
