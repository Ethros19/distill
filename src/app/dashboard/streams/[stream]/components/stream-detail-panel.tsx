import Link from 'next/link'
import type { StreamDetail, WeeklyVolume, ThemeFrequency, RecentArticle } from '../lib/stream-detail'
import { formatTimeAgo } from '@/app/dashboard/components/format-utils'

function WeeklyVolumeTable({ rows }: { rows: WeeklyVolume[] }) {
  if (rows.length === 0) {
    return <p className="text-sm italic text-muted">No volume data yet.</p>
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const weekLabel = new Date(row.week).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        return (
          <div key={row.week} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-dim">{weekLabel}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-alt">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.max(
                    4,
                    (row.count / Math.max(...rows.map((r) => r.count))) * 100,
                  )}%`,
                }}
              />
            </div>
            <span className="w-8 text-right font-medium text-ink">{row.count}</span>
          </div>
        )
      })}
    </div>
  )
}

function ThemeList({ themes }: { themes: ThemeFrequency[] }) {
  if (themes.length === 0) {
    return <p className="text-sm italic text-muted">No themes detected yet.</p>
  }

  const maxFreq = themes[0].freq

  return (
    <div className="space-y-1.5">
      {themes.map((t, i) => (
        <div key={t.theme} className="flex items-center gap-3 text-xs">
          <span className="w-4 shrink-0 text-right text-muted">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-dim">{t.theme}</span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-panel-alt">
            <div
              className="h-full rounded-full bg-accent/60 transition-all"
              style={{ width: `${(t.freq / maxFreq) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right font-medium text-ink">{t.freq}</span>
        </div>
      ))}
    </div>
  )
}

function ArticleList({ articles }: { articles: RecentArticle[] }) {
  if (articles.length === 0) {
    return <p className="text-sm italic text-muted">No articles yet.</p>
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <div key={article.id} className="space-y-0.5">
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
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{formatTimeAgo(article.createdAt)}</span>
            {article.urgency != null && article.urgency >= 4 && (
              <span className="rounded-full bg-sig-high/10 px-1.5 py-0.5 text-[10px] font-medium text-sig-high">
                High urgency
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StreamDetailPanel({
  label,
  data,
}: {
  label: string
  data: StreamDetail
}) {
  if (data.totalCount === 0) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h2 className="font-display text-xl text-ink">{label}</h2>
        <p className="mt-6 py-8 text-center text-sm italic text-muted">
          No data yet for this stream.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-ink">{label}</h2>
        <span className="font-mono text-sm text-muted">
          {data.totalCount} input{data.totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Weekly Volume */}
        <div className="rounded-xl border border-edge bg-panel p-5">
          <h3 className="mb-3 text-sm font-semibold text-dim">Weekly Volume</h3>
          <WeeklyVolumeTable rows={data.weeklyVolume} />
        </div>

        {/* Top Themes */}
        <div className="rounded-xl border border-edge bg-panel p-5">
          <h3 className="mb-3 text-sm font-semibold text-dim">Top Themes</h3>
          <ThemeList themes={data.themes} />
        </div>
      </div>

      {/* Recent Articles */}
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold text-dim">Recent Articles</h3>
        <ArticleList articles={data.recentArticles} />
      </div>
    </div>
  )
}
