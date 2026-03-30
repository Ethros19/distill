import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

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
    const raw = marked.parse(digestMarkdown) as string
    html = DOMPurify.sanitize(raw)
  }

  return (
    <div className="rounded-xl border border-edge border-l-[3px] border-l-accent bg-panel p-6">
      <div className="mb-4">
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

      {html ? (
        <div
          className="prose prose-sm max-w-none text-dim prose-headings:text-ink prose-strong:text-ink prose-blockquote:border-l-accent prose-blockquote:text-dim prose-code:rounded prose-code:bg-panel-alt prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:text-accent prose-a:text-accent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="py-4 text-center text-sm italic text-muted">
          No synthesis narrative available. Run a synthesis to generate
          cross-stream intelligence.
        </p>
      )}
    </div>
  )
}
