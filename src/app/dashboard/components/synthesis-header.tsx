import type { Synthesis } from '@/lib/schema'

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = new Date(start).toLocaleDateString('en-US', opts)
  const endStr = new Date(end).toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })
  return `${startStr} - ${endStr}`
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
}: {
  synthesis: Synthesis | null
}) {
  if (!synthesis) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No synthesis yet
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Run your first synthesis to see signals here.
        </p>
      </div>
    )
  }

  const dateRange = formatDateRange(synthesis.periodStart, synthesis.periodEnd)

  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Latest Synthesis
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            synthesis.trigger === 'manual'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {synthesis.trigger}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{dateRange}</p>
      <div className="mt-3 flex gap-4 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          <strong>{synthesis.signalCount}</strong> signals
        </span>
        <span className="text-gray-700 dark:text-gray-300">
          from <strong>{synthesis.inputCount}</strong> inputs
        </span>
        <span className="text-gray-400">
          {formatRelativeTime(synthesis.createdAt)}
        </span>
      </div>
    </div>
  )
}

// Export helpers for testing
export { formatDateRange, formatRelativeTime }
