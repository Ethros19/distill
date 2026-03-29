import { Suspense } from 'react'
import { getRadarData } from './lib/radar-data'
import { RadarGrid } from './components/radar-grid'
import type { SerializedStreamBrief } from './components/stream-briefing'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Intelligence Radar | Distill',
}

/** Pin business-dev first, then sort remaining by activity */
function defaultOrder(briefs: SerializedStreamBrief[]): SerializedStreamBrief[] {
  const businessDev = briefs.find((b) => b.stream === 'business-dev')
  const rest = briefs
    .filter((b) => b.stream !== 'business-dev')
    .sort((a, b) => {
      if (b.articles.length !== a.articles.length) return b.articles.length - a.articles.length
      return b.inputCount - a.inputCount
    })
  return businessDev ? [businessDev, ...rest] : rest
}

async function RadarContent() {
  const briefs = await getRadarData()

  // Serialize for the client component (Date → ISO string)
  const serialized: SerializedStreamBrief[] = briefs.map((b) => ({
    ...b,
    articles: b.articles.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  }))

  const ordered = defaultOrder(serialized)

  return <RadarGrid briefs={ordered} />
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
          AI-synthesized briefs across your six intelligence streams &mdash; drag to reorder
        </p>
      </div>
      <Suspense fallback={<RadarSkeleton />}>
        <RadarContent />
      </Suspense>
    </section>
  )
}
