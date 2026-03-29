'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedSource } from '@/lib/schema'

export function FeedFormModal({
  mode,
  feed,
  open,
  onClose,
}: {
  mode: 'add' | 'edit'
  feed?: FeedSource
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [pollingInterval, setPollingInterval] = useState(60)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate fields when opening in edit mode
  useEffect(() => {
    if (open && mode === 'edit' && feed) {
      setUrl(feed.url)
      setName(feed.name)
      setCategory(feed.category ?? '')
      setPollingInterval(feed.pollingInterval)
      setErrors({})
    } else if (open && mode === 'add') {
      setUrl('')
      setName('')
      setCategory('')
      setPollingInterval(60)
      setErrors({})
    }
  }, [open, mode, feed])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    function handleClose() {
      onClose()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === dialogRef.current) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      if (mode === 'add') {
        const res = await fetch('/api/admin/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            name: name.trim(),
            category: category.trim() || undefined,
            pollingInterval,
          }),
        })

        if (res.ok) {
          onClose()
          router.refresh()
        } else if (res.status === 409) {
          setErrors({ url: 'A feed source with this URL already exists' })
        } else {
          const data = await res.json()
          setErrors({ form: data.error || 'Failed to create feed' })
        }
      } else if (mode === 'edit' && feed) {
        const changes: Record<string, unknown> = {}
        if (url.trim() !== feed.url) changes.url = url.trim()
        if (name.trim() !== feed.name) changes.name = name.trim()
        const newCat = category.trim() || null
        if (newCat !== feed.category) changes.category = newCat
        if (pollingInterval !== feed.pollingInterval) changes.pollingInterval = pollingInterval

        if (Object.keys(changes).length === 0) {
          onClose()
          return
        }

        const res = await fetch(`/api/admin/feeds/${feed.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        })

        if (res.ok) {
          onClose()
          router.refresh()
        } else if (res.status === 409) {
          setErrors({ url: 'A feed source with this URL already exists' })
        } else {
          const data = await res.json()
          setErrors({ form: data.error || 'Failed to update feed' })
        }
      }
    } catch {
      setErrors({ form: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-lg rounded-xl border border-edge bg-panel p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">
            {mode === 'add' ? 'Add Feed Source' : 'Edit Feed Source'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-alt hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="feed-url" className="block text-xs text-dim">
              URL
            </label>
            <input
              id="feed-url"
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-sig-high">{errors.url}</p>
            )}
          </div>

          <div>
            <label htmlFor="feed-name" className="block text-xs text-dim">
              Name
            </label>
            <input
              id="feed-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feed name"
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="feed-category" className="block text-xs text-dim">
              Category (optional)
            </label>
            <input
              id="feed-category"
              type="text"
              maxLength={50}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., AI News, Events"
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="feed-interval" className="block text-xs text-dim">
              Poll every N minutes
            </label>
            <input
              id="feed-interval"
              type="number"
              min={1}
              required
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {errors.form && (
          <p className="mt-3 text-sm text-sig-high">{errors.form}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !url.trim() || !name.trim()}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? (mode === 'add' ? 'Creating\u2026' : 'Saving\u2026')
              : (mode === 'add' ? 'Add Feed' : 'Save Changes')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  )
}
