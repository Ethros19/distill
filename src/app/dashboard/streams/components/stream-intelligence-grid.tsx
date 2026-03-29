import Link from 'next/link'
import { STREAM_VALUES, STREAM_LABELS } from '@/lib/stream-utils'
import type { StreamIntelligenceData } from '../lib/types'
import { StreamVolumeChart } from './stream-volume-chart'
import { StreamThemeList } from './stream-theme-list'
import { StreamArticleCard } from './stream-article-card'

export function StreamIntelligenceGrid({
  data,
}: {
  data: StreamIntelligenceData
}) {
  // Prepare volume chart data with human-readable labels
  const volumeChartData = data.volume.map((v) => ({
    stream: v.stream,
    label: STREAM_LABELS[v.stream as keyof typeof STREAM_LABELS] ?? v.stream,
    count: v.count,
  }))

  return (
    <div className="space-y-8">
      {/* Volume bar chart across all streams */}
      <div className="rounded-xl border border-edge bg-panel p-5">
        <h3 className="mb-4 text-sm font-medium text-dim">
          Volume by Stream (30 days)
        </h3>
        <StreamVolumeChart data={volumeChartData} />
      </div>

      {/* Per-stream cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STREAM_VALUES.map((stream) => {
          const label =
            STREAM_LABELS[stream as keyof typeof STREAM_LABELS] ?? stream
          const volume = data.volume.find((v) => v.stream === stream)
          const themes = data.themes.filter((t) => t.stream === stream)
          const maxFreq = themes.reduce(
            (max, t) => Math.max(max, t.freq),
            0,
          )
          const topArticle = data.articles.find(
            (a) => a.stream === stream && a.summary,
          )

          return (
            <Link
              key={stream}
              href={`/dashboard/streams/${stream}`}
              className="group rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-accent/40"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-medium text-ink group-hover:text-accent">
                  {label}
                </h3>
                <span className="font-mono text-xs text-dim">
                  {volume?.count ?? 0} inputs
                </span>
              </div>

              {themes.length > 0 ? (
                <StreamThemeList themes={themes} maxFreq={maxFreq} />
              ) : (
                <p className="py-4 text-center text-xs italic text-muted">
                  No data yet
                </p>
              )}

              {topArticle &&
                topArticle.summary &&
                topArticle.urgency != null && (
                  <div className="mt-3">
                    <StreamArticleCard
                      article={{
                        id: topArticle.id,
                        summary: topArticle.summary,
                        urgency: topArticle.urgency,
                        createdAt: topArticle.createdAt.toISOString(),
                        feedUrl: topArticle.feedUrl,
                      }}
                    />
                  </div>
                )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
