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
    <div className="space-y-2.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-edge bg-panel"
        />
      ))}
    </div>
  )
}

function CardSkeleton() {
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

      {/* Row 2: Signal Strength Over Time (full width) */}
      <Suspense fallback={<ChartSkeleton />}>
        <SignalTrendSection />
      </Suspense>

      {/* Row 3: Theme Landscape */}
      <Suspense fallback={<CardSkeleton />}>
        <ThemeHeatmapSection />
      </Suspense>

      {/* Row 3: Context metrics (small cards) */}
      <Suspense fallback={<MetricSkeleton />}>
        <MetricCardsSection />
      </Suspense>
    </section>
  )
}
