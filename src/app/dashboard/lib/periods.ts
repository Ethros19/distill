export const periodLabels: Record<string, string> = {
  today: 'Today',
  past_week: 'Past Week',
  past_month: 'Past Month',
  past_year: 'Past Year',
  all: 'All Time',
}

export function startOfPeriod(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'past_week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'past_month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'past_year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    case 'all':
      return null
    default:
      return null
  }
}

export function endOfPeriod(period: string): Date | null {
  return null
}
