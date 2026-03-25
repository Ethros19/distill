'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function PasteModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [content, setContent] = useState('')
  const [source, setSource] = useState('paste')
  const [contributor, setContributor] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
      setTimeout(() => textareaRef.current?.focus(), 50)
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
      const res = await fetch('/api/intake/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source,
          contributor: contributor || 'dashboard',
        }),
      })

      if (res.ok) {
        setContent('')
        setContributor('')
        setSource('paste')
        setMessage({
          type: 'success',
          text: 'Submitted! Add another or close.',
        })
        router.refresh()
        setTimeout(() => textareaRef.current?.focus(), 50)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error ?? 'Submission failed' })
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
            Add Feedback
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

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          placeholder="Paste customer feedback, support ticket, feature request..."
          className="mt-4 block w-full resize-y rounded-lg border border-edge bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <label htmlFor="modal-source" className="block text-xs text-dim">
              Source
            </label>
            <select
              id="modal-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="paste">Paste</option>
              <option value="slack">Slack</option>
              <option value="support">Support</option>
              <option value="sales">Sales</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="phone_call">Phone Call</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex-1">
            <label
              htmlFor="modal-contributor"
              className="block text-xs text-dim"
            >
              Contributor (optional)
            </label>
            <input
              id="modal-contributor"
              type="text"
              value={contributor}
              onChange={(e) => setContributor(e.target.value)}
              placeholder="jane@company.com"
              className="mt-1 block w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Submitting\u2026' : 'Submit'}
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
              className={`text-sm ${message.type === 'success' ? 'text-sig-low' : 'text-sig-high'}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </dialog>
  )
}
