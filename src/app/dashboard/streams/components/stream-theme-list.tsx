interface StreamTheme {
  theme: string
  freq: number
}

export function StreamThemeList({
  themes,
  maxFreq,
}: {
  themes: StreamTheme[]
  maxFreq: number
}) {
  if (themes.length === 0) {
    return (
      <p className="py-4 text-center text-xs italic text-muted">
        No themes yet
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {themes.map((t) => (
        <li key={t.theme} className="rounded-lg px-2.5 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg">{t.theme}</span>
            <span className="font-mono text-xs text-dim">{t.freq}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-accent/20">
            <div
              className="h-full rounded-full bg-accent/40"
              style={{
                width: `${maxFreq > 0 ? (t.freq / maxFreq) * 100 : 0}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
