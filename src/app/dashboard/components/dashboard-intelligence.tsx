import { Suspense } from 'react'
import type { Synthesis } from '@/lib/schema'
import { SynthesisHeader } from './synthesis-header'
import { TriggerButton } from './trigger-button'
import { MetricCardsSection } from './metric-cards-section'
import { SignalTrendSection } from './signal-trend-section'
import { StreamDistributionSection } from './stream-distribution-section'
import { ThemeHeatmapSection } from './theme-heatmap-section'
import { SignalTimelineSection } from './signal-timeline-section'

function MetricCardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-edge bg-panel p-4"
          />
        ))}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-xl border border-edge bg-panel p-5" />
  )
}

function PanelSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-xl border border-edge bg-panel" />
  )
}

export function DashboardIntelligence({
  synthesis,
  unprocessedCount,
  unsynthesizedCount,
}: {
  synthesis: Synthesis | null
  unprocessedCount: number
  unsynthesizedCount: number
}) {
  return (
    <section className="space-y-5">
      <SynthesisHeader
        synthesis={synthesis}
        unprocessedCount={unprocessedCount}
        unsynthesizedCount={unsynthesizedCount}
        action={<TriggerButton />}
      />

      <h2 className="font-display text-xl italic text-dim">Intelligence</h2>

      {/* Row 1: KPI Metric Cards */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCardsSection />
      </Suspense>

      {/* Row 2: Live Intel Feed + Top Emergent Themes */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <div>
          <Suspense fallback={<PanelSkeleton />}>
            <SignalTimelineSection />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<PanelSkeleton />}>
            <ThemeHeatmapSection />
          </Suspense>
        </div>
      </div>

      {/* Row 3: Signal Volume + Input Distribution */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <SignalTrendSection />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<ChartSkeleton />}>
            <StreamDistributionSection />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
