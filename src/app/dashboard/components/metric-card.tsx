interface MetricCardProps {
  label: string
  value: string | number
  suffix?: string
  detail?: string
}

export function MetricCard({ label, value, suffix, detail }: MetricCardProps) {
  return (
    <div className="animate-fade-up rounded-xl border border-edge bg-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">
        {value}
        {suffix && (
          <span className="text-sm text-dim">{suffix}</span>
        )}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-muted">{detail}</p>
      )}
    </div>
  )
}
