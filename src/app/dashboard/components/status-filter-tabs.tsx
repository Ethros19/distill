'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const STORAGE_KEY = 'distill-status-filter'

interface StatusFilterTabsProps {
  tabs: { label: string; value: string | null }[]
  activeStatus: string | undefined
  period: string | undefined
}

function buildHref(status: string | null, period: string | undefined) {
  const params = new URLSearchParams()
  if (period) params.set('period', period)
  if (status) params.set('status', status)
  const qs = params.toString()
  return `/dashboard${qs ? `?${qs}` : ''}`
}

export function StatusFilterTabs({ tabs, activeStatus, period }: StatusFilterTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Restore saved filter on mount when no status param in URL
  useEffect(() => {
    if (!searchParams.has('status')) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        router.replace(buildHref(saved, period))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex gap-1 rounded-lg bg-panel-alt p-1">
      {tabs.map((tab) => {
        const active = activeStatus === (tab.value ?? undefined)
        return (
          <Link
            key={tab.label}
            href={buildHref(tab.value, period)}
            onClick={() => {
              if (tab.value) {
                localStorage.setItem(STORAGE_KEY, tab.value)
              } else {
                localStorage.removeItem(STORAGE_KEY)
              }
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-panel text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
