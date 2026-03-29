import { STREAM_LABELS, type Stream } from '@/lib/stream-utils'

export function streamBadge(stream: string | null): string {
  switch (stream) {
    case 'general-ai':
      return 'bg-purple-500/10 text-purple-600'
    case 'piper-dev':
      return 'bg-emerald-500/10 text-emerald-600'
    case 'event-tech':
      return 'bg-orange-500/10 text-orange-600'
    case 'event-general':
      return 'bg-amber-500/10 text-amber-600'
    case 'vc-investment':
      return 'bg-blue-500/10 text-blue-600'
    case 'product':
      return 'bg-sig-low/10 text-sig-low'
    default:
      return 'bg-panel-alt text-dim'
  }
}

export function streamLabel(stream: string | null): string {
  if (stream && stream in STREAM_LABELS) return STREAM_LABELS[stream as Stream]
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
    default:
      return status
  }
}
