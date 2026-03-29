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
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
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

  return (
    <div
      className={`animate-fade-up rounded-xl border border-edge border-t-[3px] ${borderClass} bg-panel transition-shadow hover:shadow-md`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header with gradient accent */}
      <div
        className="rounded-t-[9px] px-5 pb-4 pt-5"
        style={{
          background: `linear-gradient(180deg, ${hex}08 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${bgClass}`} />
              <Link
                href={`/dashboard/streams/${brief.stream}`}
                className="text-base font-semibold text-ink transition-colors hover:text-accent"
              >
                {brief.label}
              </Link>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {description}
            </p>
          </div>
          <TrendBadge trend={brief.trend} count={brief.inputCount} />
        </div>

        {/* Theme pills */}
        {brief.topThemes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
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

      {/* Articles */}
      <div className="border-t border-edge-dim px-5 py-4">
        {brief.articles.length === 0 ? (
          <p className="py-3 text-center text-xs italic text-muted">
            No articles in this window
          </p>
        ) : (
          <ol className="space-y-3">
            {brief.articles.map((article, i) => {
              const domain = article.feedUrl ? extractDomain(article.feedUrl) : null

              return (
                <li key={article.id} className="flex gap-3">
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
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
