'use client'

import { useState } from 'react'

interface CopyContextProps {
  context: string
}

export function CopyContextButton({ context }: CopyContextProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(context)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:border-accent/30 hover:text-accent"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Copy Context
        </>
      )}
    </button>
  )
}
