export function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'processed':
      return 'bg-sig-low/10 text-sig-low'
    case 'unprocessed':
      return 'bg-accent-wash text-accent'
    default:
      return 'bg-panel-alt text-dim'
  }
}
