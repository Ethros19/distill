import { Suspense } from 'react'
import { getStreamIntelligence } from './lib/stream-intelligence'
import { StreamIntelligenceGrid } from './components/stream-intelligence-grid'
import { StreamPanelSkeleton } from './components/stream-panel-skeleton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Streams | Distill',
}

async function StreamContent() {
  const data = await getStreamIntelligence()
  return <StreamIntelligenceGrid data={data} />
}

export default function StreamsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl italic text-dim">
          Stream Intelligence
        </h2>
        <p className="mt-1 text-sm text-muted">
          Per-vertical analysis of your intelligence feeds
        </p>
      </div>
      <Suspense fallback={<StreamPanelSkeleton />}>
        <StreamContent />
      </Suspense>
    </section>
  )
}
