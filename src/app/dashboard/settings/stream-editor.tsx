'use client'

import { useState } from 'react'
import type { StreamConfig } from '../../../../distill.config'

const EMPTY_STREAM: StreamConfig = {
  id: '',
  label: '',
  description: '',
  hex: '#6366f1',
}

const PRESET_COLORS = [
  '#a855f7', '#10b981', '#f97316', '#f59e0b', '#3b82f6',
  '#3D8A4A', '#ec4899', '#06b6d4', '#ef4444', '#8b5cf6',
]

export function StreamEditor({ initialStreams }: { initialStreams: StreamConfig[] }) {
  const [streams, setStreams] = useState<StreamConfig[]>(initialStreams)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const dirty = JSON.stringify(streams) !== JSON.stringify(initialStreams)

  function updateStream(idx: number, patch: Partial<StreamConfig>) {
    setStreams((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
    setSaved(false)
  }

  function addStream() {
    const used = new Set(streams.map((s) => s.hex))
    const nextColor = PRESET_COLORS.find((c) => !used.has(c)) ?? '#6366f1'
    setStreams((prev) => [...prev, { ...EMPTY_STREAM, hex: nextColor }])
    setExpandedIdx(streams.length)
    setSaved(false)
  }

  function removeStream(idx: number) {
    setStreams((prev) => prev.filter((_, i) => i !== idx))
    setExpandedIdx(null)
    setSaved(false)
  }

  function moveStream(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= streams.length) return
    setStreams((prev) => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    setExpandedIdx(target)
    setSaved(false)
  }

  async function save() {
    // Client-side validation
    for (const s of streams) {
      if (!s.id) { setError('Every stream needs an ID'); return }
      if (!/^[a-z0-9-]+$/.test(s.id)) { setError(`ID "${s.id}" must be lowercase with hyphens only`); return }
      if (!s.label) { setError(`Stream "${s.id}" needs a label`); return }
      if (!s.hex || !/^#[0-9a-fA-F]{6}$/.test(s.hex)) { setError(`Stream "${s.id}" has invalid color`); return }
    }
    const ids = streams.map((s) => s.id)
    if (new Set(ids).size !== ids.length) { setError('Stream IDs must be unique'); return }

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/settings/streams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streams }),
      })
      if (res.ok) {
        setSaved(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Save failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {streams.map((stream, idx) => {
          const isExpanded = expandedIdx === idx
          return (
            <div
              key={idx}
              className="rounded-lg border border-edge bg-canvas"
            >
              {/* Collapsed header */}
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: stream.hex }}
                />
                <span className="flex-1 text-sm font-medium text-ink">
                  {stream.label || stream.id || 'New stream'}
                </span>
                <span className="text-xs text-muted">{stream.id || '...'}</span>
                <svg
                  width="12" height="12" viewBox="0 0 12 12"
                  className={`text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </button>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-edge-dim px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                        ID (slug)
                      </label>
                      <input
                        value={stream.id}
                        onChange={(e) => updateStream(idx, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="e.g. market-intel"
                        className="w-full rounded-md border border-edge bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                        Label
                      </label>
                      <input
                        value={stream.label}
                        onChange={(e) => updateStream(idx, { label: e.target.value })}
                        placeholder="e.g. Market Intelligence"
                        className="w-full rounded-md border border-edge bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                      Description (used in AI classification prompts)
                    </label>
                    <input
                      value={stream.description}
                      onChange={(e) => updateStream(idx, { description: e.target.value })}
                      placeholder="e.g. Competitor analysis, market trends, pricing intel"
                      className="w-full rounded-md border border-edge bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateStream(idx, { hex: color })}
                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                              stream.hex === color ? 'border-ink scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={stream.hex}
                        onChange={(e) => updateStream(idx, { hex: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <span className="text-xs text-muted font-mono">{stream.hex}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
                        Feed Categories (comma-separated)
                      </label>
                      <input
                        value={(stream.categories ?? []).join(', ')}
                        onChange={(e) => updateStream(idx, {
                          categories: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                        })}
                        placeholder="e.g. AI News, AI Research"
                        className="w-full rounded-md border border-edge bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 text-xs text-dim">
                        <input
                          type="checkbox"
                          checked={stream.pinFirst ?? false}
                          onChange={(e) => updateStream(idx, { pinFirst: e.target.checked })}
                          className="rounded border-edge"
                        />
                        Pin first on Radar
                      </label>
                      <label className="flex items-center gap-2 text-xs text-dim">
                        <input
                          type="checkbox"
                          checked={stream.highVolume ?? false}
                          onChange={(e) => updateStream(idx, { highVolume: e.target.checked })}
                          className="rounded border-edge"
                        />
                        High volume
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => moveStream(idx, -1)}
                      disabled={idx === 0}
                      className="rounded px-2 py-1 text-xs text-muted hover:bg-panel-alt hover:text-ink disabled:opacity-30"
                    >
                      Move up
                    </button>
                    <button
                      onClick={() => moveStream(idx, 1)}
                      disabled={idx === streams.length - 1}
                      className="rounded px-2 py-1 text-xs text-muted hover:bg-panel-alt hover:text-ink disabled:opacity-30"
                    >
                      Move down
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => removeStream(idx)}
                      className="rounded px-2 py-1 text-xs text-sig-high hover:bg-sig-high/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={addStream}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge py-2.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add stream
      </button>

      {error && <p className="text-xs text-sig-high">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            dirty
              ? 'bg-accent text-white hover:opacity-90'
              : 'bg-panel-alt text-muted cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Save Streams'}
        </button>
        {saved && (
          <span className="text-xs text-sig-low">
            Saved. Changes take effect on next page load.
          </span>
        )}
      </div>
    </div>
  )
}
