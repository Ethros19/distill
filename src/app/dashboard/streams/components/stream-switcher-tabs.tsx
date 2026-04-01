import Link from 'next/link'

interface StreamSwitcherTabsProps {
  current: string
  streams: { id: string; label: string }[]
}

export function StreamSwitcherTabs({ current, streams }: StreamSwitcherTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-panel-alt p-1">
      {streams.map((stream) => (
        <Link
          key={stream.id}
          href={`/dashboard/streams/${stream.id}`}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            stream.id === current
              ? 'bg-panel text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {stream.label}
        </Link>
      ))}
    </div>
  )
}
