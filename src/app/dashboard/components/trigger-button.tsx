'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasteModal } from './paste-form'
import { SynthesisOverlay } from './synthesis-overlay'

export async function triggerSynthesis(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/synthesis', { method: 'POST' })
  if (!res.ok) {
    const data = await res.json()
    return { ok: false, error: data.error ?? 'Synthesis failed' }
  }
  return { ok: true }
}

export function TriggerButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setError('')
    setLoading(true)
    try {
      const result = await triggerSynthesis()
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error ?? 'Synthesis failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Running\u2026' : 'Run Synthesis'}
      </button>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent"
      >
        + Add Feedback
      </button>
      {error && <p className="text-sm text-sig-high">{error}</p>}
      <PasteModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <SynthesisOverlay active={loading} />
    </div>
  )
}
