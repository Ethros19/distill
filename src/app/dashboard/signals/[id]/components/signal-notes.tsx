'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function SignalNotes({
  signalId,
  initialNotes,
}: {
  signalId: string
  initialNotes: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  async function handleSave() {
    if (saving) return
    const value = notes.trim()
    if (value === saved) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value || null }),
      })
      if (res.ok) {
        setSaved(value)
        setNotes(value)
        setEditing(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 1500)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Save failed')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      setNotes(saved)
      setEditing(false)
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSave()
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={ref}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full resize-none rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Add a note for re-synthesis context (e.g., 'sub-point A is already resolved, only B is new')..."
          autoFocus
          disabled={saving}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
          <button
            onClick={() => {
              setNotes(saved)
              setEditing(false)
            }}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt"
          >
            Cancel
          </button>
          <span className="text-[10px] text-muted">\u2318+Enter to save, Esc to cancel</span>
        </div>
        {error && <p className="text-xs text-sig-high">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {saved ? (
        <button
          onClick={() => setEditing(true)}
          className="group text-left text-sm leading-relaxed text-dim hover:text-ink"
        >
          {saved}
          <span className="ml-1.5 text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            edit
          </span>
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-muted hover:text-dim"
        >
          Add note for re-synthesis context...
        </button>
      )}
      {showSaved && (
        <span className="text-[10px] text-sig-low animate-pulse">Saved</span>
      )}
    </div>
  )
}
