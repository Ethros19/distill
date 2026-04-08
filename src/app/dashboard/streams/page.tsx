import { Suspense } from 'react'
import { getStreamIntelligence } from './lib/stream-intelligence'
import { getSynthesisScopeData } from './lib/synthesis-scope'
import { StreamIntelligenceGrid } from './components/stream-intelligence-grid'

import { MarketValidationSection } from './components/market-validation-section'
import { PerStreamSynthesisCard } from './components/per-stream-synthesis-card'
import { CrossStreamHighlights } from './components/cross-stream-highlights'
import { StreamPanelSkeleton } from './components/stream-panel-skeleton'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Streams | Distill',
}

async function SynthesisContent() {
  const [synthesisData, streamIntelligence] = await Promise.all([
    getSynthesisScopeData(),
    getStreamIntelligence(),
  ])

  // Build signal counts map for CrossStreamHighlights
  const signalCounts: Record<string, number> = {}
  for (const cst of synthesisData.crossStreamThemes) {
    if (cst.signalCount > 0) {
      signalCounts[cst.theme] = cst.signalCount
    }
  }

  // Map cross-stream themes to the CrossStreamTheme shape expected by the component
  const crossStreamThemes = synthesisData.crossStreamThemes.map((cst) => ({
    theme: cst.theme,
    streamCount: cst.streamCount,
    totalFreq: cst.streamCount, // use streamCount as frequency proxy
    streams: cst.streams,
  }))

  return (
    <div className="space-y-8">
      {/* Market Validation */}
      <MarketValidationSection validations={synthesisData.marketValidations} />

      {/* Cross-Stream Patterns (enhanced with signal counts) */}
      <CrossStreamHighlights
        themes={crossStreamThemes}
        signalCounts={signalCounts}
      />

      {/* Per-Stream Synthesis Panels */}
      {synthesisData.perStreamSynthesis.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg italic text-dim">
            Per-Stream Synthesis
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {synthesisData.perStreamSynthesis.map((pss) => (
              <PerStreamSynthesisCard key={pss.stream} data={pss} />
            ))}
          </div>
        </div>
      )}

      {/* Existing Volume & Trends (secondary section) */}
      <StreamIntelligenceGrid data={streamIntelligence} />
    </div>
  )
}

export default function StreamsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl italic text-dim">
          Synthesis Intelligence
        </h2>
        <p className="mt-1 text-sm text-muted">
          Where your signals meet industry intel
        </p>
      </div>
      <Suspense fallback={<StreamPanelSkeleton />}>
        <SynthesisContent />
      </Suspense>
    </section>
  )
}
