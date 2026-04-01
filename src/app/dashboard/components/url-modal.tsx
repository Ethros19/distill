'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function UrlModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
      setTimeout(() => inputRef.current?.focus(), 50)
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
    setMessage(null)
    setLoading(true)

    try {
      const res = await fetch('/api/intake/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()

      if (res.ok) {
        setUrl('')
        setMessage({
          type: 'success',
          text: `Added: ${data.title ?? url}`,
        })
        router.refresh()
        setTimeout(() => inputRef.current?.focus(), 50)
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to add' })
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.',
      })
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
          <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
            Add Source
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

        <p className="mt-2 text-xs text-muted">
          Paste a link to an article, blog post, or webpage. Distill will fetch the content and add it as an input for synthesis.
        </p>

        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com/article"
          className="mt-4 block w-full rounded-lg border border-edge bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Fetching\u2026' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
            >
              Close
            </button>
          </div>
          {message && (
            <p
              className={`max-w-[200px] truncate text-sm ${message.type === 'success' ? 'text-sig-low' : 'text-sig-high'}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </dialog>
  )
}
