import { STREAM_LABELS, streamHex } from '@/lib/stream-utils'

export function streamBadgeStyle(stream: string | null): React.CSSProperties {
  if (!stream) return {}
  const hex = streamHex(stream)
  return { backgroundColor: `${hex}1A`, color: hex }
}

export function streamLabel(stream: string | null): string {
  if (stream && stream in STREAM_LABELS) return STREAM_LABELS[stream]
  return stream ?? 'Untagged'
}

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

export function signalStatusBadge(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-accent-wash text-accent'
    case 'acknowledged':
      return 'bg-panel-alt text-dim'
    case 'in_progress':
      return 'bg-sig-mid/10 text-sig-mid'
    case 'resolved':
      return 'bg-sig-low/10 text-sig-low'
    case 'dismissed':
      return 'bg-panel-alt text-muted'
    default:
      return 'bg-panel-alt text-dim'
  }
}

export function typeLabel(type: string | null): string {
  switch (type) {
    case 'feature_request':
      return 'Feature Request'
    case 'bug_report':
      return 'Bug Report'
    case 'praise':
      return 'Praise'
    case 'complaint':
      return 'Complaint'
    case 'observation':
      return 'Observation'
    default:
      return 'Unknown'
  }
}

export function typeBadge(type: string | null): string {
  switch (type) {
    case 'feature_request':
      return 'bg-sig-low/10 text-sig-low'
    case 'bug_report':
      return 'bg-sig-high/10 text-sig-high'
    case 'praise':
      return 'bg-amber-500/10 text-amber-600'
    case 'complaint':
      return 'bg-sig-mid/10 text-sig-mid'
    case 'observation':
      return 'bg-panel-alt text-dim'
    default:
      return 'bg-panel-alt text-dim'
  }
}

export function signalStatusLabel(status: string): string {
  switch (status) {
    case 'new':
      return 'New'
    case 'acknowledged':
      return 'Acknowledged'
    case 'in_progress':
      return 'In Progress'
    case 'resolved':
      return 'Resolved'
    case 'dismissed':
      return 'Dismissed'
    default:
      return status
  }
}

export function healthBadge(source: {
  enabled: boolean
  lastError: string | null
  lastPolledAt: Date | null
}): { label: string; classes: string } {
  if (source.lastError) return { label: 'Error', classes: 'bg-sig-high/10 text-sig-high' }
  if (!source.enabled) return { label: 'Disabled', classes: 'bg-panel-alt text-dim' }
  if (!source.lastPolledAt) return { label: 'Never Polled', classes: 'bg-accent-wash text-accent' }
  return { label: 'Healthy', classes: 'bg-sig-low/10 text-sig-low' }
}
