'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SIGNAL_STATUSES } from '@/lib/schema'
import {
  signalStatusBadge,
  signalStatusLabel,
} from '../../../components/format-utils'

export function StatusControls({
  signalId,
  currentStatus,
}: {
  signalId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(status: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update status')
        return
      }
      router.refresh()
    } catch {
      setError('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {SIGNAL_STATUSES.map((status) =>
          status === currentStatus ? (
            <span
              key={status}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${signalStatusBadge(status)}`}
            >
              {signalStatusLabel(status)}
            </span>
          ) : (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={loading}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              {signalStatusLabel(status)}
            </button>
          )
        )}
      </div>
      {error && <p className="text-xs text-sig-high">{error}</p>}
    </div>
  )
}
