'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {loading ? 'Running...' : 'Run Synthesis'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
