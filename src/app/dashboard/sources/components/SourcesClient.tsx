'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { FeedSource } from '@/lib/schema'
import { SourceRow } from './SourceRow'
import { SourcesToolbar } from './SourcesToolbar'
import { FeedFormModal } from './FeedFormModal'

type FeedWithCount = FeedSource & { inputCount: number }

export function SourcesClient({ feeds, activeStreamCount }: { feeds: FeedWithCount[]; activeStreamCount: number }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editFeed, setEditFeed] = useState<FeedSource | undefined>(undefined)

  const healthCounts = useMemo(() => {
    let healthy = 0, errored = 0, disabled = 0
    for (const f of feeds) {
      if (f.lastError) errored++
      else if (!f.enabled) disabled++
      else if (f.lastPolledAt) healthy++
    }
    return { healthy, errored, disabled }
  }, [feeds])

  function handleAdd() {
    setModalMode('add')
    setEditFeed(undefined)
    setModalOpen(true)
  }

  function handleEdit(feed: FeedWithCount) {
    setModalMode('edit')
    setEditFeed(feed)
    setModalOpen(true)
  }

  return (
    <>
      {/* Header */}
      <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl tracking-tight text-ink">
            Sources
          </h2>
          <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            Data
          </span>
          <span className="text-sm text-muted">
            {feeds.length} {feeds.length === 1 ? 'source' : 'sources'}
          </span>
          <div className="flex items-center gap-2 text-xs">
            {healthCounts.healthy > 0 && (
              <span className="flex items-center gap-1 text-sig-low">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sig-low" />
                {healthCounts.healthy} healthy
              </span>
            )}
            {healthCounts.errored > 0 && (
              <span className="flex items-center gap-1 text-sig-high">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sig-high" />
                {healthCounts.errored} errored
              </span>
            )}
            {healthCounts.disabled > 0 && (
              <span className="flex items-center gap-1 text-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
                {healthCounts.disabled} disabled
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inputs"
            className="text-sm text-accent transition-colors hover:text-ink"
          >
            View Inputs &rarr;
          </Link>
          <SourcesToolbar feedCount={feeds.length} onAddClick={handleAdd} />
        </div>
      </div>
      <p className="text-sm text-dim">
        Feed source management &mdash; {activeStreamCount} {activeStreamCount === 1 ? 'stream' : 'streams'} with active coverage
      </p>
      </div>

      {/* Feed list */}
      {feeds.length > 0 ? (
        <div className="rounded-xl border border-edge bg-panel p-5">
          <ul className="divide-y divide-edge-dim">
            {feeds.map((feed, i) => (
              <div
                key={feed.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <SourceRow feed={feed} onEdit={handleEdit} />
              </div>
            ))}
          </ul>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm italic text-muted">
            No feed sources configured. Add a source or load recommended feeds to get started.
          </p>
        </div>
      )}

      <FeedFormModal
        mode={modalMode}
        feed={editFeed}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
