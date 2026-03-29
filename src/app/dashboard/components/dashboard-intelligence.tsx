import { Suspense } from 'react'
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

function GridSkeleton() {
  return (
    <div className="h-56 animate-pulse rounded-xl border border-edge bg-panel p-5" />
  )
}

export function DashboardIntelligence() {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-xl italic text-dim">Intelligence</h2>

      {/* Row 1: KPI Metric Cards */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCardsSection />
      </Suspense>

      {/* Row 2: Signal Trend + Stream Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

      {/* Row 3: Theme Heatmap + Signal Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<GridSkeleton />}>
            <ThemeHeatmapSection />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<GridSkeleton />}>
            <SignalTimelineSection />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
