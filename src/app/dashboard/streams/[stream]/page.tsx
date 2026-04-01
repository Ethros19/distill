import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStreams, deriveStreamMaps } from '@/lib/stream-config'
import { getStreamDetail } from './lib/stream-detail'
import { StreamDetailPanel } from './components/stream-detail-panel'
import { StreamSwitcherTabs } from '../components/stream-switcher-tabs'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stream: string }>
}): Promise<Metadata> {
  const { stream } = await params
  const streams = await getStreams()
  const { labels } = deriveStreamMaps(streams)
  if (!labels[stream]) return { title: 'Stream Not Found | Distill' }
  return { title: `${labels[stream]} | Distill` }
}

export const dynamic = 'force-dynamic'

async function StreamDetailContent({ stream, label }: { stream: string; label: string }) {
  const data = await getStreamDetail(stream)
  return <StreamDetailPanel label={label} data={data} />
}

function StreamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-panel-alt" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-edge bg-panel" />
        <div className="h-56 animate-pulse rounded-xl border border-edge bg-panel" />
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-edge bg-panel" />
    </div>
  )
}

export default async function StreamDetailPage({
  params,
}: {
  params: Promise<{ stream: string }>
}) {
  const { stream } = await params
  const streamConfigs = await getStreams()
  const { labels } = deriveStreamMaps(streamConfigs)
  if (!labels[stream]) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-sm">
        <Link
          href="/dashboard/streams"
          className="text-dim transition-colors hover:text-accent"
        >
          &larr; Streams
        </Link>
        <span className="text-muted">/</span>
        <span className="font-medium text-ink">{labels[stream]}</span>
      </div>

      <StreamSwitcherTabs
        current={stream}
        streams={streamConfigs.map((s) => ({ id: s.id, label: s.label }))}
      />

      <Suspense fallback={<StreamDetailSkeleton />}>
        <StreamDetailContent stream={stream} label={labels[stream]} />
      </Suspense>
    </div>
  )
}
