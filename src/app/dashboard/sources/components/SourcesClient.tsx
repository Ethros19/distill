'use client'

import { useState } from 'react'
import type { FeedSource } from '@/lib/schema'
import { SourceRow } from './SourceRow'
import { SourcesToolbar } from './SourcesToolbar'
import { FeedFormModal } from './FeedFormModal'

type FeedWithCount = FeedSource & { inputCount: number }

export function SourcesClient({ feeds }: { feeds: FeedWithCount[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editFeed, setEditFeed] = useState<FeedSource | undefined>(undefined)

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
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl tracking-tight text-ink">
            Sources
          </h2>
          <span className="text-sm text-muted">
            {feeds.length} {feeds.length === 1 ? 'source' : 'sources'}
          </span>
        </div>
        <SourcesToolbar feedCount={feeds.length} onAddClick={handleAdd} />
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
