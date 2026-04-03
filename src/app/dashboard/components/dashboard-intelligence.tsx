import { Suspense } from 'react'
import { MetricCardsSection } from './metric-cards-section'
import { SignalTrendSection } from './signal-trend-section'
import { StreamDistributionSection } from './stream-distribution-section'
import { ThemeHeatmapSection } from './theme-heatmap-section'
import { SignalTimelineSection } from './signal-timeline-section'

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

function MetricSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-edge bg-panel"
        />
      ))}
    </div>
  )
}

export function DashboardIntelligence() {
  return (
    <section className="space-y-5">
      {/* Row 1: Active Signals (full width, scrollable feed) */}
      <Suspense fallback={<PanelSkeleton />}>
        <SignalTimelineSection />
      </Suspense>

      {/* Row 2: Theme Landscape + Signal Trend */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<PanelSkeleton />}>
            <ThemeHeatmapSection />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <SignalTrendSection />
          </Suspense>
        </div>
      </div>

      {/* Row 3: Context metrics (small cards) */}
      <Suspense fallback={<MetricSkeleton />}>
        <MetricCardsSection />
      </Suspense>
    </section>
  )
}
