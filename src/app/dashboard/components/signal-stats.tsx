import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { gte, count } from 'drizzle-orm'
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

async function countInputsSince(since: Date): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(inputs)
    .where(gte(inputs.createdAt, since))
  return result?.count ?? 0
}

async function countInputsTotal(): Promise<number> {
  const [result] = await db.select({ count: count() }).from(inputs)
  return result?.count ?? 0
}

export async function SignalStats() {
  const [today, week, month, year, total] = await Promise.all([
    countInputsSince(startOf('day')),
    countInputsSince(startOf('week')),
    countInputsSince(startOf('month')),
    countInputsSince(startOf('year')),
    countInputsTotal(),
  ])

  const stats = [
    { label: 'Today', value: today, period: 'today' },
    { label: 'Week', value: week, period: 'week' },
    { label: 'Month', value: month, period: 'month' },
    { label: 'Year', value: year, period: 'year' },
    { label: 'Total', value: total, period: 'total', highlight: true },
  ]

  return <StatsBar stats={stats} />
}
