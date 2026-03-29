import Link from 'next/link'
import {
  STREAM_HEX_COLORS,
  STREAM_BORDER_COLORS,
  STREAM_BG_COLORS,
  STREAM_DESCRIPTIONS,
  type Stream,
} from '@/lib/stream-utils'
import type { StreamBrief } from '../lib/radar-data'
import { formatTimeAgo } from '@/app/dashboard/components/format-utils'

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function trendLabel(trend: string, count: number): string {
  if (trend === 'rising') return `Rising activity — ${count} items tracked`
  if (trend === 'falling') return `Declining activity — ${count} items tracked`
  return `Steady activity — ${count} items tracked`
}

function TrendBadge({ trend, count }: { trend: string; count: number }) {
  if (trend === 'rising') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sig-low/10 px-2 py-0.5 text-xs font-medium text-sig-low">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
        </svg>
        {count}
      </span>
    )
  }
  if (trend === 'falling') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sig-high/10 px-2 py-0.5 text-xs font-medium text-sig-high">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
        </svg>
        {count}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-panel-alt px-2 py-0.5 text-xs font-medium text-muted">
      {count}
    </span>
  )
}

export function StreamBriefing({
  brief,
  index,
}: {
  brief: StreamBrief
  index: number
}) {
  const hex = STREAM_HEX_COLORS[brief.stream] ?? '#888'
  const borderClass = STREAM_BORDER_COLORS[brief.stream] ?? 'border-t-edge'
  const bgClass = STREAM_BG_COLORS[brief.stream] ?? 'bg-muted'
  const description = STREAM_DESCRIPTIONS[brief.stream as Stream] ?? ''

  // Build a brief synopsis from available data
  const themeSummary =
    brief.topThemes.length > 0
      ? `Key themes: ${brief.topThemes.slice(0, 3).join(', ')}.`
      : ''
  const leadArticle = brief.articles[0]
  const synopsis = leadArticle?.summary
    ? leadArticle.summary
    : `${trendLabel(brief.trend, brief.inputCount)}${themeSummary ? ` ${themeSummary}` : ''}`

  return (
    <div
      className={`animate-fade-up flex flex-col rounded-xl border border-edge border-t-[3px] ${borderClass} bg-panel transition-shadow hover:shadow-md`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div
        className="px-5 pb-3 pt-4"
        style={{
          background: `linear-gradient(180deg, ${hex}08 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${bgClass}`} />
            <Link
              href={`/dashboard/streams/${brief.stream}`}
              className="text-base font-semibold text-ink transition-colors hover:text-accent"
            >
              {brief.label}
            </Link>
          </div>
          <TrendBadge trend={brief.trend} count={brief.inputCount} />
        </div>
        <p className="mt-1 text-[11px] text-muted">{description}</p>
      </div>

      {/* Synopsis brief — the "WORLD BRIEF" equivalent */}
      <div className="border-t border-edge-dim px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Brief
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">
          {synopsis}
        </p>
        {brief.topThemes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {brief.topThemes.map((theme) => (
              <Link
                key={theme}
                href={`/dashboard/themes/${encodeURIComponent(theme)}`}
                className="rounded-full bg-panel-alt px-2 py-0.5 text-[11px] font-medium text-dim transition-colors hover:bg-accent/10 hover:text-accent"
              >
                {theme}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable articles feed */}
      <div className="border-t border-edge-dim">
        <div className="flex items-center justify-between px-5 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Top Articles
          </p>
          {brief.articles.length > 0 && (
            <span className="text-[10px] tabular-nums text-muted">
              {brief.articles.length}
            </span>
          )}
        </div>

        {brief.articles.length === 0 ? (
          <div className="px-5 pb-4">
            <p className="text-xs italic text-muted">No articles in this window</p>
          </div>
        ) : (
          <div className="intel-scroll max-h-[260px] overflow-y-auto pb-2">
            {brief.articles.map((article, i) => {
              const domain = article.feedUrl ? extractDomain(article.feedUrl) : null

              return (
                <div
                  key={article.id}
                  className={`flex gap-3 px-5 py-2.5 transition-colors hover:bg-panel-alt/50 ${
                    i < brief.articles.length - 1 ? 'border-b border-edge-dim' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-alt text-[10px] font-semibold tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink">
                      {article.feedUrl ? (
                        <a
                          href={article.feedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-accent"
                        >
                          {article.summary ?? 'Untitled'}
                        </a>
                      ) : (
                        article.summary ?? 'Untitled'
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                      {domain && (
                        <>
                          <span>{domain}</span>
                          <span className="text-edge">|</span>
                        </>
                      )}
                      <span suppressHydrationWarning>
                        {formatTimeAgo(article.createdAt)}
                      </span>
                      {article.urgency != null && article.urgency >= 4 && (
                        <>
                          <span className="text-edge">|</span>
                          <span
                            className={
                              article.urgency >= 5
                                ? 'font-medium text-sig-high'
                                : 'font-medium text-sig-mid'
                            }
                          >
                            urgency {article.urgency}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
