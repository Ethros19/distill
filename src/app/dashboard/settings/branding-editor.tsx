'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

export function BrandingEditor({
  initialName,
  initialLogoUrl,
}: {
  initialName: string
  initialLogoUrl: string
}) {
  const [name, setName] = useState(initialName)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileToUpload = useRef<File | null>(null)

  const dirty = name !== initialName || preview !== null

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const formData = new FormData()
      formData.append('companyName', name)
      if (fileToUpload.current) {
        formData.append('logo', fileToUpload.current)
      }

      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        body: formData,
      })

      if (res.ok) {
        setSaved(true)
        if (preview) {
          setLogoUrl(preview)
          setPreview(null)
          fileToUpload.current = null
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function removeLogo() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/branding', { method: 'DELETE' })
      if (res.ok) {
        setLogoUrl('')
        setPreview(null)
        fileToUpload.current = null
        if (fileRef.current) fileRef.current.value = ''
      }
    } finally {
      setSaving(false)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    fileToUpload.current = file
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    setSaved(false)
  }

  const displayLogo = preview || logoUrl

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-dim">Company Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          placeholder="e.g. Piper"
          className="w-full max-w-sm rounded-lg border border-edge-dim bg-canvas px-4 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-dim">Logo</label>
        <div className="flex items-center gap-4">
          {displayLogo && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-edge-dim bg-canvas">
              <Image
                src={displayLogo}
                alt="Company logo"
                fill
                className="object-contain p-1"
                unoptimized={!!preview}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent"
            >
              {displayLogo ? 'Change' : 'Upload'}
            </button>
            {displayLogo && (
              <button
                type="button"
                onClick={removeLogo}
                className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-sig-high transition-colors hover:border-sig-high/40"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
        <p className="text-[11px] text-muted">
          Square logo works best. Displayed at 28x28px in the header.
        </p>
      </div>

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
          <span className="text-xs text-sig-low">Saved. Refresh to see header changes.</span>
        )}
      </div>
    </div>
  )
}
