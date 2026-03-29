'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedSource } from '@/lib/schema'
import { formatTimeAgo } from '../../components/format-utils'

type SourceRowFeed = FeedSource & { inputCount: number }

function healthBadge(feed: SourceRowFeed) {
  if (feed.lastError) return { label: 'Error', classes: 'bg-sig-high/10 text-sig-high' }
  if (!feed.enabled) return { label: 'Disabled', classes: 'bg-panel-alt text-dim' }
  if (!feed.lastPolledAt) return { label: 'Never Polled', classes: 'bg-accent-wash text-accent' }
  return { label: 'Healthy', classes: 'bg-sig-low/10 text-sig-low' }
}

export function SourceRow({
  feed,
  onEdit,
}: {
  feed: SourceRowFeed
  onEdit: (feed: SourceRowFeed) => void
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [polling, setPolling] = useState(false)
  const [pollResult, setPollResult] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [showErrorDetail, setShowErrorDetail] = useState(false)

  const health = healthBadge(feed)

  async function handleToggle() {
    if (toggling) return
    setToggling(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/feeds/${feed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !feed.enabled }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Toggle failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('An error occurred')
    } finally {
      setToggling(false)
    }
  }

  async function handlePoll() {
    if (polling) return
    setPolling(true)
    setPollResult(null)
    setPollError(null)
    setError('')
    try {
      const res = await fetch(`/api/admin/feeds/${feed.id}/poll`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setPollResult(`${data.newItems} new item${data.newItems === 1 ? '' : 's'}`)
        setTimeout(() => setPollResult(null), 4000)
        router.refresh()
      } else {
        setPollError(data.error || 'Poll failed')
        setTimeout(() => setPollError(null), 6000)
        router.refresh()
      }
    } catch {
      setPollError('An error occurred')
      setTimeout(() => setPollError(null), 6000)
    } finally {
      setPolling(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/feeds/${feed.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Delete failed')
        setShowConfirm(false)
      }
    } catch {
      setError('An error occurred')
      setShowConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        {/* Left: info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink truncate">{feed.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${health.classes}`}>
              {health.label}
            </span>
            {feed.category && (
              <span className="rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium text-dim">
                {feed.category}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{feed.url}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
            <span>{feed.lastPolledAt ? formatTimeAgo(feed.lastPolledAt) : 'Never polled'}</span>
            <span>&middot;</span>
            <span>{feed.inputCount} input{feed.inputCount === 1 ? '' : 's'}</span>
            <span>&middot;</span>
            <span>{feed.pollingInterval}m interval</span>
          </div>
          {feed.lastError && (
            <button
              onClick={() => setShowErrorDetail(!showErrorDetail)}
              className="mt-1 text-xs text-sig-high hover:underline"
            >
              {showErrorDetail ? 'Hide error' : 'Show error'}
            </button>
          )}
          {feed.lastError && showErrorDetail && (
            <p className="mt-1 text-xs text-sig-high break-all">{feed.lastError}</p>
          )}
          {pollResult && (
            <p className="mt-1 text-xs text-sig-low">{pollResult}</p>
          )}
          {pollError && (
            <p className="mt-1 text-xs text-sig-high">{pollError}</p>
          )}
          {error && (
            <p className="mt-1 text-xs text-sig-high">{error}</p>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
              feed.enabled
                ? 'bg-sig-low/10 text-sig-low hover:bg-sig-low/20'
                : 'bg-panel-alt text-muted hover:bg-edge'
            }`}
            title={feed.enabled ? 'Disable feed' : 'Enable feed'}
          >
            {feed.enabled ? 'Enabled' : 'Disabled'}
          </button>

          {/* Poll Now */}
          <button
            onClick={handlePoll}
            disabled={polling}
            className="rounded-lg border border-edge px-2.5 py-1 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink disabled:opacity-50"
          >
            {polling ? (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
                </svg>
                Polling...
              </span>
            ) : (
              'Poll Now'
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(feed)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-alt hover:text-ink"
            title="Edit feed"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Delete */}
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-alt hover:text-sig-high"
              title="Delete feed"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-sig-high/10 px-2.5 py-1 text-xs font-medium text-sig-high transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Deleting\u2026' : 'Delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-edge px-2.5 py-1 text-xs font-medium text-dim transition-colors hover:bg-panel-alt"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
