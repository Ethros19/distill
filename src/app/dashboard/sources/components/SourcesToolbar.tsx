'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SourcesToolbar({
  feedCount,
  onAddClick,
}: {
  feedCount: number
  onAddClick: () => void
}) {
  const router = useRouter()
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  async function handleSeed() {
    if (seeding) return
    setSeeding(true)
    setSeedResult(null)
    setSeedError(null)
    try {
      const res = await fetch('/api/admin/feeds/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSeedResult(`Added ${data.seeded} feed${data.seeded === 1 ? '' : 's'} (${data.skipped} already existed)`)
        setTimeout(() => setSeedResult(null), 5000)
        router.refresh()
      } else {
        setSeedError(data.error || 'Seed failed')
        setTimeout(() => setSeedError(null), 5000)
      }
    } catch {
      setSeedError('An error occurred')
      setTimeout(() => setSeedError(null), 5000)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {seedResult && (
        <span className="text-xs text-sig-low">{seedResult}</span>
      )}
      {seedError && (
        <span className="text-xs text-sig-high">{seedError}</span>
      )}
      <button
        onClick={handleSeed}
        disabled={seeding}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink disabled:opacity-50"
      >
        {seeding ? 'Loading\u2026' : 'Load Recommended Feeds'}
      </button>
      <button
        onClick={onAddClick}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
      >
        + Add Source
      </button>
    </div>
  )
}
