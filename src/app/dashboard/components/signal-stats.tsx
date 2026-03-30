import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql } from 'drizzle-orm'
import { StatsBar } from './stats-bar'

function startOf(period: 'day' | 'week' | 'month' | 'year'): Date {
  const now = new Date()
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(now.getFullYear(), now.getMonth(), diff)
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
  }
}

export async function SignalStats() {
  const todayStart = startOf('day')
  const yesterdayStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - 1)
  const weekStart = startOf('week')
  const monthStart = startOf('month')
  const yearStart = startOf('year')

  const [row] = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE created_at >= ${yesterdayStart.toISOString()} AND created_at < ${todayStart.toISOString()})::int AS yesterday,
      count(*) FILTER (WHERE created_at >= ${todayStart.toISOString()})::int AS today,
      count(*) FILTER (WHERE created_at >= ${weekStart.toISOString()})::int AS week,
      count(*) FILTER (WHERE created_at >= ${monthStart.toISOString()})::int AS month,
      count(*) FILTER (WHERE created_at >= ${yearStart.toISOString()})::int AS year,
      count(*)::int AS total
    FROM inputs
  `) as unknown as [{ yesterday: number; today: number; week: number; month: number; year: number; total: number }]

  const stats = [
    { label: 'Yesterday', value: row.yesterday, period: 'yesterday' },
    { label: 'Today', value: row.today, period: 'today' },
    { label: 'Week', value: row.week, period: 'week' },
    { label: 'Month', value: row.month, period: 'month' },
    { label: 'Year', value: row.year, period: 'year' },
    { label: 'Total', value: row.total, period: 'total', highlight: true },
  ]

  return <StatsBar stats={stats} />
}
