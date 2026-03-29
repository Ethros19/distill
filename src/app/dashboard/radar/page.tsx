import { Suspense } from 'react'
import { getRadarData } from './lib/radar-data'
import { StreamBriefing } from './components/stream-briefing'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Intelligence Radar | Distill',
}

/** Pin piper-dev first, then sort remaining by activity */
function sortBriefs(briefs: Awaited<ReturnType<typeof getRadarData>>) {
  const piperDev = briefs.find((b) => b.stream === 'piper-dev')
  const rest = briefs
    .filter((b) => b.stream !== 'piper-dev')
    .sort((a, b) => {
      if (b.articles.length !== a.articles.length) return b.articles.length - a.articles.length
      return b.inputCount - a.inputCount
    })
  return piperDev ? [piperDev, ...rest] : rest
}

async function RadarContent() {
  const briefs = await getRadarData()
  const sorted = sortBriefs(briefs)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((brief, i) => (
        <StreamBriefing key={brief.stream} brief={brief} index={i} />
      ))}
    </div>
  )
}

function RadarSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-xl border border-edge bg-panel"
        />
      ))}
    </div>
  )
}

export default function RadarPage() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl italic text-dim">
          Intelligence Radar
        </h2>
        <p className="mt-1 text-sm text-muted">
          AI-synthesized briefs across your six intelligence streams
        </p>
      </div>
      <Suspense fallback={<RadarSkeleton />}>
        <RadarContent />
      </Suspense>
    </section>
  )
}
