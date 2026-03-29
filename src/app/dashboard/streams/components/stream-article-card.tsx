interface StreamArticle {
  id: string
  summary: string
  urgency: number
  createdAt: string
  feedUrl: string | null
}

function urgencyBadge(urgency: number) {
  if (urgency >= 5) return 'bg-red-500/15 text-red-400'
  if (urgency >= 4) return 'bg-amber-500/15 text-amber-400'
  return 'bg-dim/15 text-dim'
}

function relativeDate(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export function StreamArticleCard({ article }: { article: StreamArticle }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-relaxed text-fg">{article.summary}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${urgencyBadge(article.urgency)}`}
        >
          {article.urgency}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-dim">
        <span suppressHydrationWarning>{relativeDate(article.createdAt)}</span>
        {article.feedUrl && (
          <a
            href={article.feedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-accent hover:underline"
          >
            Source
          </a>
        )}
      </div>
    </div>
  )
}
