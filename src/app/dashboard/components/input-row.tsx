'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Input } from '@/lib/schema'
import { formatTimeAgo, statusBadge, typeBadge, typeLabel } from './format-utils'

export function InputRow({ input }: { input: Input }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/inputs/${input.id}`, { method: 'DELETE' })
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">
            {input.summary || input.rawContent.slice(0, 120)}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
            <span>{input.source}</span>
            <span>&middot;</span>
            <span>{input.contributor}</span>
            <span>&middot;</span>
            <span>{formatTimeAgo(input.createdAt)}</span>
          </div>
          {input.themes && input.themes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {input.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium text-dim"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
          {error && (
            <p className="mt-1 text-xs text-sig-high">{error}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(input.status)}`}
          >
            {input.status}
          </span>
          {input.type && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadge(input.type)}`}
            >
              {typeLabel(input.type)}
            </span>
          )}
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-alt hover:text-sig-high"
              title="Delete input"
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
