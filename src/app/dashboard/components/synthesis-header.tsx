import type { Synthesis } from '@/lib/schema'

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = new Date(start).toLocaleDateString('en-US', opts)
  const endStr = new Date(end).toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })
  return `${startStr} \u2013 ${endStr}`
}

function formatRelativeTime(date: Date): string {
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

export function SynthesisHeader({
  synthesis,
  action,
}: {
  synthesis: Synthesis | null
  action?: React.ReactNode
}) {
  if (!synthesis) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg italic text-ink">
              Awaiting first synthesis
            </h2>
            <p className="mt-2 text-sm text-dim">
              Send feedback via email or paste, then run a synthesis to surface
              signals.
            </p>
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      </div>
    )
  }

  const dateRange = formatDateRange(synthesis.periodStart, synthesis.periodEnd)

  return (
    <div className="rounded-xl border border-edge bg-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
              Latest Synthesis
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                synthesis.trigger === 'manual'
                  ? 'bg-accent-wash text-accent'
                  : 'bg-panel-alt text-dim'
              }`}
            >
              {synthesis.trigger}
            </span>
          </div>
          <p className="mt-2 font-display text-xl text-ink">{dateRange}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-ink">
              <strong className="font-mono">
                {synthesis.signalCount}
              </strong>{' '}
              <span className="text-dim">signals</span>
            </span>
            <span className="text-muted">&middot;</span>
            <span className="text-ink">
              <strong className="font-mono">
                {synthesis.inputCount}
              </strong>{' '}
              <span className="text-dim">inputs</span>
            </span>
            <span className="text-muted">&middot;</span>
            <span className="text-xs text-muted">
              {formatRelativeTime(synthesis.createdAt)}
            </span>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}

export { formatDateRange, formatRelativeTime }
