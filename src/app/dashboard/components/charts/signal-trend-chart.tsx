'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface TrendPoint {
  date: string
  high: number
  mid: number
  low: number
}

const BANDS = [
  { key: 'high', label: 'High', color: 'var(--signal-high)', opacity: 0.55 },
  { key: 'mid', label: 'Medium', color: 'var(--signal-mid)', opacity: 0.4 },
  { key: 'low', label: 'Low', color: 'var(--signal-low)', opacity: 0.35 },
] as const

// Render order: low at bottom, high on top (most important = most visible)
const RENDER_ORDER = [...BANDS].reverse()

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

  const total = payload.reduce((sum, p) => sum + p.value, 0)

  return (
    <div
      className="rounded-lg border border-edge bg-panel px-3.5 py-2.5 shadow-lg"
      style={{ minWidth: 140 }}
    >
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-xs text-dim">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            {BANDS.find((b) => b.key === entry.dataKey)?.label}
          </span>
          <span className="font-mono text-xs tabular-nums text-ink">
            {entry.value}
          </span>
        </div>
      ))}
      <div className="mt-1.5 flex items-center justify-between border-t border-edge-dim pt-1.5">
        <span className="text-[11px] text-muted">Total</span>
        <span className="font-mono text-xs font-semibold tabular-nums text-ink">
          {total}
        </span>
      </div>
    </div>
  )
}

export function SignalTrendChart({ data }: { data: TrendPoint[] }) {
  const [hiddenBands, setHiddenBands] = useState<Set<string>>(new Set())

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm italic text-muted">
        Trend data will appear after multiple synthesis runs.
      </p>
    )
  }

  function toggleBand(key: string) {
    setHiddenBands((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        {BANDS.map((band) => {
          const hidden = hiddenBands.has(band.key)
          return (
            <button
              key={band.key}
              onClick={() => toggleBand(band.key)}
              className="group flex items-center gap-1.5 transition-opacity"
              style={{ opacity: hidden ? 0.35 : 1 }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px] transition-all group-hover:scale-110"
                style={{
                  background: band.color,
                  opacity: hidden ? 0.3 : 1,
                }}
              />
              <span className="text-[11px] font-medium text-dim transition-colors group-hover:text-ink">
                {band.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              {BANDS.map((band) => (
                <linearGradient key={band.key} id={`grad-${band.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={band.color} stopOpacity={band.opacity} />
                  <stop offset="100%" stopColor={band.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
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
                strokeOpacity: 0.4,
              }}
            />
            {RENDER_ORDER.map((band) => (
              <Area
                key={band.key}
                type="monotone"
                dataKey={band.key}
                stackId="1"
                stroke={hiddenBands.has(band.key) ? 'transparent' : band.color}
                fill={hiddenBands.has(band.key) ? 'transparent' : `url(#grad-${band.key})`}
                strokeWidth={2}
                activeDot={
                  hiddenBands.has(band.key)
                    ? false
                    : {
                        r: 4,
                        fill: band.color,
                        stroke: 'var(--surface)',
                        strokeWidth: 2,
                      }
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
