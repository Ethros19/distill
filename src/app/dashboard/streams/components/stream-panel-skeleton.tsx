export function StreamPanelSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-edge bg-panel p-5">
      {/* Chart area placeholder */}
      <div className="mb-4 h-48 rounded-lg bg-edge-dim" />

      {/* Theme list placeholder (3 lines) */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-edge-dim" />
        <div className="h-4 w-1/2 rounded bg-edge-dim" />
        <div className="h-4 w-2/3 rounded bg-edge-dim" />
      </div>

      {/* Article card placeholders (2 cards) */}
      <div className="space-y-3">
        <div className="h-16 rounded-lg bg-edge-dim" />
        <div className="h-16 rounded-lg bg-edge-dim" />
      </div>
    </div>
  )
}
