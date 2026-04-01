import Link from 'next/link'
import {
  STREAM_HEX_COLORS,
  STREAM_BORDER_COLORS,
  STREAM_BG_COLORS,
  STREAM_DESCRIPTIONS,
  type Stream,
} from '@/lib/stream-utils'
import { formatTimeAgo } from '@/app/dashboard/components/format-utils'
import { COMPANY_NAME } from '@/lib/company-config'
import { CaptureButton } from './radar-capture'

/** Serializable version of StreamBrief (dates as ISO strings) */
export interface SerializedStreamBrief {
  stream: string
  label: string
  trend: string
  inputCount: number
  priorCount: number
  topThemes: string[]
  articles: {
    id: string
    summary: string | null
    feedUrl: string | null
    urgency: number | null
    createdAt: string
  }[]
  synopsis: string
  companyImplication: string
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
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
  brief: SerializedStreamBrief
  index: number
}) {
  const hex = STREAM_HEX_COLORS[brief.stream] ?? '#888'
  const borderClass = STREAM_BORDER_COLORS[brief.stream] ?? 'border-t-edge'
  const bgClass = STREAM_BG_COLORS[brief.stream] ?? 'bg-muted'
  const description = STREAM_DESCRIPTIONS[brief.stream as Stream] ?? ''

  const displayArticles = brief.articles.slice(0, 5)

  return (
    <div
      className={`animate-fade-up flex flex-col rounded-xl border border-edge border-t-[3px] ${borderClass} bg-panel transition-shadow hover:shadow-md`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header — stream name + trend */}
      <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-3 pr-10">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${bgClass}`} />
          <Link
            href={`/dashboard/streams/${brief.stream}`}
            className="text-sm font-semibold text-ink transition-colors hover:text-accent"
          >
            {brief.label}
          </Link>
        </div>
        <TrendBadge trend={brief.trend} count={brief.inputCount} />
      </div>

      {/* Company implication */}
      {brief.companyImplication && (
        <div className="mx-3 mb-3 rounded-lg bg-panel-alt px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
              What this means for {COMPANY_NAME}
            </p>
            <CaptureButton
              text={brief.companyImplication}
              context={`${brief.label} — Company Implication`}
            />
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-dim">
            {brief.companyImplication}
          </p>
        </div>
      )}

      {/* Synopsis — visually distinct, tinted background */}
      <div
        className="mx-3 mb-3 rounded-lg border-l-[3px] px-4 py-3"
        style={{
          borderLeftColor: hex,
          background: `linear-gradient(135deg, ${hex}0A 0%, ${hex}04 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Brief
          </p>
          <CaptureButton
            text={brief.synopsis}
            context={`${brief.label} — Brief`}
          />
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
          {brief.synopsis}
        </p>
        {brief.topThemes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {brief.topThemes.map((theme) => (
              <Link
                key={theme}
                href={`/dashboard/themes/${encodeURIComponent(theme)}`}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-dim transition-colors hover:text-accent"
                style={{ background: `${hex}12` }}
              >
                {theme}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Articles feed — compact list */}
      <div className="border-t border-edge-dim">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Top Stories
          </p>
          {displayArticles.length > 0 && (
            <span className="text-[10px] tabular-nums text-muted">
              {displayArticles.length}
            </span>
          )}
        </div>

        {displayArticles.length === 0 ? (
          <div className="px-4 pb-3">
            <p className="text-xs italic text-muted">No articles in this window</p>
          </div>
        ) : (
          <div className="intel-scroll max-h-[220px] overflow-y-auto pb-2">
            {displayArticles.map((article, i) => {
              const domain = article.feedUrl ? extractDomain(article.feedUrl) : null

              return (
                <div
                  key={article.id}
                  className={`flex gap-2.5 px-4 py-2 transition-colors hover:bg-panel-alt/50 ${
                    i < displayArticles.length - 1 ? 'border-b border-edge-dim' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-ink line-clamp-2">
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
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                      {domain && <span>{domain}</span>}
                      {domain && (
                        <span className="text-edge">&middot;</span>
                      )}
                      <span suppressHydrationWarning>
                        {formatTimeAgo(new Date(article.createdAt))}
                      </span>
                      {article.urgency != null && article.urgency >= 5 && (
                        <>
                          <span className="text-edge">&middot;</span>
                          <span className="font-medium text-sig-high">
                            urgent
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <CaptureButton
                    text={article.summary ?? 'Untitled'}
                    context={`${brief.label} — Article`}
                    className="mt-0.5"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
