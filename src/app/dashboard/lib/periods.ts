export const periodLabels: Record<string, string> = {
  yesterday: 'Yesterday',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  total: 'All Time',
}

export function startOfPeriod(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'yesterday':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    case 'today':
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
    case 'total':
      return null
    default:
      return null
  }
}

export function endOfPeriod(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'yesterday':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    default:
      return null
  }
}
