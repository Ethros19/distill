'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SettingsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isActive = pathname.startsWith('/dashboard/settings') || pathname.startsWith('/dashboard/integrations')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-panel-alt hover:text-ink ${
          isActive ? 'text-ink' : 'text-dim'
        }`}
        aria-label="Settings menu"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block" aria-hidden="true">
          <path d="M6.5 1.5h3l.5 2 1.5.9 2-.5 1.5 2.6-1.5 1.5v1.5l1.5 1.5-1.5 2.6-2-.5-1.5.9-.5 2h-3l-.5-2-1.5-.9-2 .5L1 11l1.5-1.5V8L1 6.5l1.5-2.6 2 .5L6 3.5l.5-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="8" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-edge bg-panel py-1 shadow-lg">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-panel-alt ${
              pathname.startsWith('/dashboard/settings') ? 'text-ink' : 'text-dim'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6.5 1.5h3l.5 2 1.5.9 2-.5 1.5 2.6-1.5 1.5v1.5l1.5 1.5-1.5 2.6-2-.5-1.5.9-.5 2h-3l-.5-2-1.5-.9-2 .5L1 11l1.5-1.5V8L1 6.5l1.5-2.6 2 .5L6 3.5l.5-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="8" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Settings
          </Link>
          <Link
            href="/dashboard/integrations"
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-panel-alt ${
              pathname.startsWith('/dashboard/integrations') ? 'text-ink' : 'text-dim'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1v4M7 9v4M1 7h4M9 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Integrations
          </Link>
        </div>
      )}
    </div>
  )
}
