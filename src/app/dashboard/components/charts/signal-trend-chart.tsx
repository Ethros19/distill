'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// Distinct, colorblind-friendly palette for up to 8 theme lines
const PALETTE = [
  '#635bff', // accent purple
  '#e11d48', // rose
  '#059669', // emerald
  '#d97706', // amber
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  // Sort by value descending in tooltip
  const sorted = [...payload].sort((a, b) => b.value - a.value)

  return (
    <div
      className="rounded-lg border border-edge bg-panel px-3.5 py-2.5 shadow-lg"
      style={{ minWidth: 180 }}
    >
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted">
        {label}
      </p>
      {sorted.map((entry) =>
        entry.value > 0 ? (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-xs text-dim">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="max-w-[140px] truncate">{entry.dataKey}</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-ink">
              {entry.value}
            </span>
          </div>
        ) : null,
      )}
    </div>
  )
}

export function SignalTrendChart({
  data,
  themes,
}: {
  data: Array<Record<string, string | number>>
  themes: string[]
}) {
  const [hiddenThemes, setHiddenThemes] = useState<Set<string>>(new Set())

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm italic text-muted">
        Trend data will appear after multiple synthesis runs.
      </p>
    )
  }

  function toggleTheme(theme: string) {
    setHiddenThemes((prev) => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme)
      else next.add(theme)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {themes.map((theme, i) => {
          const color = PALETTE[i % PALETTE.length]
          const hidden = hiddenThemes.has(theme)
          return (
            <button
              key={theme}
              onClick={() => toggleTheme(theme)}
              className="group flex items-center gap-1.5 transition-opacity"
              style={{ opacity: hidden ? 0.3 : 1 }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full transition-all group-hover:scale-125"
                style={{ background: color }}
              />
              <span className="max-w-[120px] truncate text-[11px] font-medium text-dim transition-colors group-hover:text-ink">
                {theme}
              </span>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'var(--accent)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
                strokeOpacity: 0.3,
              }}
            />
            {themes.map((theme, i) => {
              const color = PALETTE[i % PALETTE.length]
              const hidden = hiddenThemes.has(theme)
              return (
                <Line
                  key={theme}
                  type="monotone"
                  dataKey={theme}
                  stroke={hidden ? 'transparent' : color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={
                    hidden
                      ? false
                      : {
                          r: 4,
                          fill: color,
                          stroke: 'var(--surface)',
                          strokeWidth: 2,
                        }
                  }
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
