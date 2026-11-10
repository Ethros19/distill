'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasteModal } from './paste-form'
import { UrlModal } from './url-modal'
import { SynthesisOverlay } from './synthesis-overlay'

const SKIPPED_NOTICE =
  'Nothing to synthesize: no feedback inputs were processed in the last 7 days.'

export async function triggerSynthesis(): Promise<{
  ok: boolean
  error?: string
  skipped?: boolean
}> {
  const res = await fetch('/api/synthesis', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Synthesis failed' }
  }
  // The API answers 200 with status 'skipped' when there is nothing to
  // synthesize. Surface that instead of silently doing nothing.
  if (data.status === 'skipped') {
    return { ok: true, skipped: true }
  }
  return { ok: true }
}

export function TriggerButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [urlModalOpen, setUrlModalOpen] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const result = await triggerSynthesis()
      if (result.skipped) {
        setNotice(SKIPPED_NOTICE)
      } else if (result.ok) {
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
      <button
        type="button"
        onClick={() => setUrlModalOpen(true)}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent"
      >
        + Add Source
      </button>
      {error && <p className="text-sm text-sig-high">{error}</p>}
      {notice && (
        <p role="status" className="text-sm text-dim">
          {notice}
        </p>
      )}
      <PasteModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <UrlModal open={urlModalOpen} onClose={() => setUrlModalOpen(false)} />
      <SynthesisOverlay active={loading} />
    </div>
  )
}
