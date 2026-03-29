import { Suspense } from 'react'
import { getRadarData } from './lib/radar-data'
import { StreamBriefing } from './components/stream-briefing'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Intelligence Radar | Distill',
}

async function RadarContent() {
  const briefs = await getRadarData()

  // Sort: streams with most articles first, then by input count
  const sorted = [...briefs].sort((a, b) => {
    if (b.articles.length !== a.articles.length) return b.articles.length - a.articles.length
    return b.inputCount - a.inputCount
  })

  const activeStreams = sorted.filter((b) => b.articles.length > 0 || b.inputCount > 0)
  const inactiveStreams = sorted.filter((b) => b.articles.length === 0 && b.inputCount === 0)

  return (
    <div className="space-y-8">
      {/* Active streams grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {activeStreams.map((brief, i) => (
          <StreamBriefing key={brief.stream} brief={brief} index={i} />
        ))}
      </div>

      {/* Inactive streams (collapsed) */}
      {inactiveStreams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
            Quiet Sectors
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {inactiveStreams.map((brief) => (
              <div
                key={brief.stream}
                className="rounded-lg border border-edge-dim bg-panel/50 px-3 py-2.5 text-center"
              >
                <p className="text-xs font-medium text-muted">{brief.label}</p>
                <p className="mt-0.5 text-[10px] italic text-muted/60">No activity</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RadarSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-xl border border-edge bg-panel"
        />
      ))}
    </div>
  )
}

export default function RadarPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl italic text-dim">
          Intelligence Radar
        </h2>
        <p className="mt-1 text-sm text-muted">
          What&apos;s happening across your intelligence streams &mdash; top stories and emerging themes
        </p>
      </div>
      <Suspense fallback={<RadarSkeleton />}>
        <RadarContent />
      </Suspense>
    </section>
  )
}
