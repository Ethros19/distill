'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Input } from '@/lib/schema'
import { formatTimeAgo, statusBadge, typeBadge, typeLabel, streamBadgeStyle, streamLabel } from './format-utils'

interface StreamOption {
  id: string
  label: string
}

export function InputRow({ input, streams }: { input: Input; streams?: StreamOption[] }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showForceDelete, setShowForceDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [isFeedback, setIsFeedback] = useState(input.isFeedback)
  const [toggling, setToggling] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(input.notes ?? '')
  const [savedNotes, setSavedNotes] = useState(input.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [currentStream, setCurrentStream] = useState(input.stream ?? '')
  const [updatingStream, setUpdatingStream] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  async function handleStreamChange(newStream: string) {
    if (updatingStream) return
    const value = newStream || null
    const prev = currentStream
    setCurrentStream(newStream)
    setUpdatingStream(true)
    setError('')
    try {
      const res = await fetch(`/api/inputs/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: value }),
      })
      if (!res.ok) {
        setCurrentStream(prev)
        const data = await res.json()
        setError(data.error || 'Stream update failed')
      } else {
        router.refresh()
      }
    } catch {
      setCurrentStream(prev)
      setError('An error occurred')
    } finally {
      setUpdatingStream(false)
    }
  }

  async function handleToggleFeedback() {
    if (toggling) return
    const prev = isFeedback
    setIsFeedback(!prev)
    setToggling(true)
    setError('')
    try {
      const res = await fetch(`/api/inputs/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_feedback: !prev }),
      })
      if (!res.ok) {
        setIsFeedback(prev)
        const data = await res.json()
        setError(data.error || 'Toggle failed')
      } else {
        router.refresh()
      }
    } catch {
      setIsFeedback(prev)
      setError('An error occurred')
    } finally {
      setToggling(false)
    }
  }

  async function handleSaveNotes() {
    if (savingNotes) return
    const value = notes.trim()
    if (value === savedNotes) {
      setEditingNotes(false)
      return
    }
    setSavingNotes(true)
    setError('')
    try {
      const res = await fetch(`/api/inputs/${input.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value || null }),
      })
      if (res.ok) {
        setSavedNotes(value)
        setNotes(value)
        setEditingNotes(false)
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
      setSavingNotes(false)
    }
  }

  function handleNotesKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      setNotes(savedNotes)
      setEditingNotes(false)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveNotes()
    }
  }

  async function handleDelete(force = false) {
    setDeleting(true)
    setError('')
    try {
      const url = force
        ? `/api/inputs/${input.id}?force=true`
        : `/api/inputs/${input.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else if (res.status === 409 && !force) {
        setShowConfirm(false)
        setShowForceDelete(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Delete failed')
        setShowConfirm(false)
        setShowForceDelete(false)
      }
    } catch {
      setError('An error occurred')
      setShowConfirm(false)
      setShowForceDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className={`py-3 first:pt-0 last:pb-0 ${!isFeedback ? 'border-l-2 border-sig-mid/30 pl-3' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-left text-sm ${isFeedback ? 'text-ink' : 'text-muted'} ${expanded ? '' : 'truncate'} w-full`}
          >
            {expanded ? (input.rawContent || input.summary) : (input.summary || input.rawContent.slice(0, 120))}
          </button>
          {expanded && input.summary && input.rawContent && input.summary !== input.rawContent && (
            <p className="mt-2 text-xs text-dim italic">
              Summary: {input.summary}
            </p>
          )}
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
          {input.status === 'processed' && !isFeedback && (
            <p className="mt-1 text-[10px] text-muted">Industry context for synthesis</p>
          )}
          {editingNotes ? (
            <div className="mt-1.5">
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                onKeyDown={handleNotesKeyDown}
                rows={2}
                className="w-full resize-none rounded-md border border-edge bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                placeholder="Add a note..."
                autoFocus
                disabled={savingNotes}
              />
            </div>
          ) : (
            <div className="mt-1.5">
              {savedNotes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="group flex items-center gap-1 text-xs text-dim hover:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-muted group-hover:text-ink">
                    <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="truncate max-w-[240px]">{savedNotes.length > 60 ? savedNotes.slice(0, 60) + '\u2026' : savedNotes}</span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-muted hover:text-dim"
                >
                  Add note...
                </button>
              )}
              {showSaved && (
                <span className="ml-2 text-[10px] text-sig-low animate-pulse">Saved</span>
              )}
            </div>
          )}
          {error && (
            <p className="mt-1 text-xs text-sig-high">{error}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {input.status === 'processed' && (
            <button
              onClick={handleToggleFeedback}
              disabled={toggling}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                isFeedback
                  ? 'bg-sig-low/10 text-sig-low hover:bg-sig-low/20'
                  : 'bg-panel-alt text-muted hover:bg-edge'
              }`}
              title={isFeedback ? 'Mark as intel' : 'Mark as feedback'}
            >
              {isFeedback ? 'Feedback' : 'Intel'}
            </button>
          )}
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
          <select
            value={currentStream}
            onChange={(e) => handleStreamChange(e.target.value)}
            disabled={updatingStream}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer disabled:opacity-50"
            style={currentStream ? streamBadgeStyle(currentStream) : { backgroundColor: 'var(--panel-alt)', color: 'var(--muted)' }}
          >
            <option value="">Set stream...</option>
            {(streams ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {showForceDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-sig-mid">Referenced by signals</span>
              <button
                onClick={() => handleDelete(true)}
                disabled={deleting}
                className="rounded-lg bg-sig-high px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleting ? 'Deleting\u2026' : 'Force Delete'}
              </button>
              <button
                onClick={() => setShowForceDelete(false)}
                className="rounded-lg border border-edge px-2.5 py-1 text-xs font-medium text-dim transition-colors hover:bg-panel-alt"
              >
                Cancel
              </button>
            </div>
          ) : !showConfirm ? (
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
                onClick={() => handleDelete(false)}
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
