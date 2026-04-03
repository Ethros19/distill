import type { Synthesis } from '@/lib/schema'
import { TriggerButton } from './trigger-button'

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

function NarrativeProse({ markdown }: { markdown: string }) {
  // Simple markdown→HTML: headings, bold, paragraphs
  const html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hp])(.+)/gm, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    // Remove <p> wrapping around headings
    .replace(/<p>(<h3>)/g, '$1')
    .replace(/(<\/h3>)<\/p>/g, '$1')

  return (
    <div
      className="narrative-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function SynthesisHeader({
  synthesis,
  unprocessedCount = 0,
  unsynthesizedCount = 0,
}: {
  synthesis: Synthesis | null
  unprocessedCount?: number
  unsynthesizedCount?: number
}) {
  if (!synthesis) {
    return (
      <div className="card-elevated rounded-xl border border-edge bg-panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg italic text-ink">
              Awaiting first synthesis
            </h2>
            <p className="mt-2 text-sm text-dim">
              Send feedback via email or paste, then run a synthesis to surface
              signals.
            </p>
            {(unprocessedCount > 0 || unsynthesizedCount > 0) && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                {unprocessedCount > 0 && (
                  <span className="font-medium text-sig-mid">
                    <strong className="font-mono">{unprocessedCount}</strong>{' '}
                    unprocessed
                  </span>
                )}
                {unsynthesizedCount > 0 && (
                  <span className="font-medium text-sig-low">
                    <strong className="font-mono">{unsynthesizedCount}</strong>{' '}
                    unsynthesized
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="ml-4 shrink-0">
            <TriggerButton />
          </div>
        </div>
      </div>
    )
  }

  const dateRange = formatDateRange(synthesis.periodStart, synthesis.periodEnd)

  return (
    <div className="card-elevated rounded-xl border border-edge bg-panel p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
            Latest Synthesis
          </h3>
          <span className="font-mono text-xs text-muted">{dateRange}</span>
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
        <TriggerButton />
      </div>

      {/* Narrative prose or fallback stats */}
      {synthesis.digestMarkdown ? (
        <NarrativeProse markdown={synthesis.digestMarkdown} />
      ) : (
        <div className="flex items-center gap-6 text-sm">
          <span className="text-ink">
            <strong className="font-mono">{synthesis.signalCount}</strong>{' '}
            <span className="text-dim">signals</span>
          </span>
          <span className="text-muted">&middot;</span>
          <span className="text-ink">
            <strong className="font-mono">{synthesis.inputCount}</strong>{' '}
            <span className="text-dim">inputs</span>
          </span>
        </div>
      )}

      {/* Pending counts below narrative */}
      {(unprocessedCount > 0 || unsynthesizedCount > 0) && (
        <div className="mt-4 flex items-center gap-4 border-t border-edge-dim pt-3 text-sm">
          {unprocessedCount > 0 && (
            <span className="text-sig-mid cursor-help" title="Inputs received but not yet structured by AI.">
              <strong className="font-mono">{unprocessedCount}</strong> unprocessed
            </span>
          )}
          {unsynthesizedCount > 0 && (
            <span className="text-sig-low cursor-help" title="Inputs structured but not yet included in a synthesis.">
              <strong className="font-mono">{unsynthesizedCount}</strong> unsynthesized
            </span>
          )}
          <span className="text-xs text-muted" suppressHydrationWarning>
            {formatRelativeTime(synthesis.createdAt)}
          </span>
        </div>
      )}
    </div>
  )
}

export { formatDateRange, formatRelativeTime }
