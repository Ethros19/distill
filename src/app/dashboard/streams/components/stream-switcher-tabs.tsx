import Link from 'next/link'
import { STREAM_VALUES, STREAM_LABELS } from '@/lib/stream-utils'

interface StreamSwitcherTabsProps {
  current: string
}

export function StreamSwitcherTabs({ current }: StreamSwitcherTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-panel-alt p-1">
      {STREAM_VALUES.map((stream) => (
        <Link
          key={stream}
          href={`/dashboard/streams/${stream}`}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            stream === current
              ? 'bg-panel text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {STREAM_LABELS[stream]}
        </Link>
      ))}
    </div>
  )
}
