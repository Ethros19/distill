'use client'

import { useState } from 'react'

export function ProductContextEditor({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = value !== initialValue

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/product-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productContext: value }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        rows={16}
        className="w-full rounded-lg border border-edge-dim bg-canvas px-4 py-3 font-mono text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        placeholder={`## Budget Edit Page\n- @mention tagging with email notifications ✓\n- Cell-level inline comments ✓\n- Page-level comments ✗\n\n## Dashboard\n- Project cards with status badges ✓\n- Client-level grouping ✗`}
      />
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
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && (
          <span className="text-xs text-sig-low">Saved. Next synthesis will use this context.</span>
        )}
      </div>
    </div>
  )
}
