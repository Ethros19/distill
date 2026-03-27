'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signalStatusBadge, signalStatusLabel } from './format-utils'

const STATUSES = ['new', 'acknowledged', 'in_progress', 'resolved'] as const

export function SignalStatusDropdown({
  signalId,
  status: initialStatus,
}: {
  signalId: string
  status: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function selectStatus(newStatus: string) {
    if (newStatus === status) {
      setOpen(false)
      return
    }
    setUpdating(true)
    try {
      const res = await fetch(`/api/signals/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    } finally {
      setUpdating(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={updating}
        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${signalStatusBadge(status)} ${
          updating ? 'opacity-50' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        {signalStatusLabel(status)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-edge-dim bg-panel py-1 shadow-lg">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => selectStatus(s)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                status === s
                  ? 'text-accent'
                  : 'text-dim hover:bg-panel-alt hover:text-ink'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${signalStatusBadge(s)}`}
              />
              {signalStatusLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
