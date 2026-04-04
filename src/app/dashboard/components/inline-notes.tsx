'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function InlineNotes({
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
        router.refresh()
      }
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
      <div className="mt-3 border-t border-edge-dim pt-3" onClick={(e) => e.preventDefault()}>
        <textarea
          ref={ref}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="w-full resize-none rounded-lg border border-edge bg-canvas px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Add a note..."
          autoFocus
          disabled={saving}
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={(e) => { e.preventDefault(); handleSave() }}
            disabled={saving}
            className="rounded bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-80 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setNotes(saved); setEditing(false) }}
            className="rounded border border-edge px-2.5 py-1 text-[11px] font-medium text-dim hover:bg-panel-alt"
          >
            Cancel
          </button>
          <span className="text-[10px] text-muted">⌘+Enter to save</span>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="mt-3 border-t border-edge-dim pt-3">
        <button
          onClick={(e) => { e.preventDefault(); setEditing(true) }}
          className="group w-full text-left"
        >
          <p className="text-xs italic text-dim">
            <span className="font-medium text-muted">Note:</span> {saved}
            <span className="ml-1 text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
              edit
            </span>
          </p>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-edge-dim pt-2">
      <button
        onClick={(e) => { e.preventDefault(); setEditing(true) }}
        className="text-[11px] text-muted hover:text-dim"
      >
        + Add note
      </button>
    </div>
  )
}
