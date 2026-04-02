'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TrendPoint {
  date: string
  count: number
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
      <LineChart data={data}>
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
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
