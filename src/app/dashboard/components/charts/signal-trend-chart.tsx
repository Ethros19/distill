'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TrendPoint {
  date: string
  high: number
  mid: number
  low: number
}

export function SignalTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm italic text-muted">
        Trend data will appear after multiple synthesis runs.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
      <AreaChart data={data}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border-main)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--fg)',
          }}
        />
        <Area
          type="monotone"
          dataKey="high"
          stackId="1"
          stroke="var(--signal-high)"
          fill="var(--signal-high)"
          fillOpacity={0.6}
          name="High"
        />
        <Area
          type="monotone"
          dataKey="mid"
          stackId="1"
          stroke="var(--signal-mid)"
          fill="var(--signal-mid)"
          fillOpacity={0.4}
          name="Medium"
        />
        <Area
          type="monotone"
          dataKey="low"
          stackId="1"
          stroke="var(--signal-low)"
          fill="var(--signal-low)"
          fillOpacity={0.3}
          name="Low"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
