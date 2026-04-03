import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { StatsBar } from './stats-bar'

export async function SignalStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  const result = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE created_at >= ${todayStart.toISOString()})::int AS today,
      count(*) FILTER (WHERE created_at >= ${weekAgo.toISOString()})::int AS past_week,
      count(*) FILTER (WHERE created_at >= ${monthAgo.toISOString()})::int AS past_month,
      count(*) FILTER (WHERE created_at >= ${yearAgo.toISOString()})::int AS past_year,
      count(*)::int AS total
    FROM inputs
  `)

  const row = (result as unknown as { rows: Array<{ today: number; past_week: number; past_month: number; past_year: number; total: number }> }).rows[0]

  const stats = [
    { label: 'Today', value: row.today, period: 'today' },
    { label: 'Past Week', value: row.past_week, period: 'past_week' },
    { label: 'Past Month', value: row.past_month, period: 'past_month' },
    { label: 'Past Year', value: row.past_year, period: 'past_year' },
    { label: 'All Time', value: row.total, period: 'all', highlight: true },
  ]

  return <StatsBar stats={stats} />
}
