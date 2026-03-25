'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export interface StatItem {
  label: string
  value: number
  period: string
  highlight?: boolean
}

export function StatsBar({ stats }: { stats: StatItem[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activePeriod = searchParams.get('period')

  return (
    <div className="flex items-center">
      {stats.map((stat, i) => {
        const isActive = activePeriod === stat.period
        const href = isActive ? pathname : `${pathname}?period=${stat.period}`

        return (
          <Link
            key={stat.label}
            href={href}
            className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
              i > 0 ? 'border-l border-edge-dim' : ''
            } ${isActive ? 'bg-accent-wash' : 'hover:bg-panel-alt'}`}
          >
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                isActive || stat.highlight ? 'text-accent' : 'text-ink'
              }`}
            >
              {stat.value}
            </span>
            <span
              className={`text-xs ${isActive ? 'text-accent' : 'text-dim'}`}
            >
              {stat.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
