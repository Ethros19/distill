import { marked } from 'marked'
import { NarrativeContent } from './narrative-content'

interface SynthesisNarrativePanelProps {
  digestMarkdown: string | null
  synthesisDate: Date | null
  signalCount: number
  industryInputCount: number
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SynthesisNarrativePanel({
  digestMarkdown,
  synthesisDate,
  signalCount,
  industryInputCount,
}: SynthesisNarrativePanelProps) {
  let html: string | null = null
  if (digestMarkdown) {
    html = marked.parse(digestMarkdown) as string
  }

  return (
    <div className="rounded-xl border border-edge border-l-[3px] border-l-accent bg-panel p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg italic text-dim">
            Synthesis Narrative
          </h2>
          {synthesisDate && (
            <p className="mt-1 text-xs text-muted">
              Generated {formatDate(synthesisDate)} from {signalCount} signal
              {signalCount !== 1 ? 's' : ''} and {industryInputCount} industry
              input{industryInputCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {html ? (
        <NarrativeContent html={html} />
      ) : (
        <p className="py-4 text-center text-sm italic text-muted">
          No synthesis narrative available. Run a synthesis to generate
          cross-stream intelligence.
        </p>
      )}
    </div>
  )
}
