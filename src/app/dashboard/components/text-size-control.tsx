'use client'

import { useEffect, useState } from 'react'

const SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 22] as const
const DEFAULT = 16

export function TextSizeControl() {
  const [size, setSize] = useState(DEFAULT)

  useEffect(() => {
    const saved = localStorage.getItem('distill-text-size')
    if (saved) {
      const n = Number(saved)
      if (SIZES.includes(n as (typeof SIZES)[number])) {
        setSize(n)
        document.documentElement.style.fontSize = `${n}px`
      }
    }
  }, [])

  function change(delta: number) {
    const idx = SIZES.indexOf(size as (typeof SIZES)[number])
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, idx + delta))]
    setSize(next)
    document.documentElement.style.fontSize = `${next}px`
    localStorage.setItem('distill-text-size', String(next))
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-edge-dim px-1">
      <button
        onClick={() => change(-1)}
        disabled={size === SIZES[0]}
        className="px-1.5 py-1 text-xs font-semibold text-dim transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Decrease text size"
      >
        A−
      </button>
      <span className="h-3 w-px bg-edge-dim" aria-hidden="true" />
      <button
        onClick={() => change(1)}
        disabled={size === SIZES[SIZES.length - 1]}
        className="px-1.5 py-1 text-sm font-semibold text-dim transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Increase text size"
      >
        A+
      </button>
    </div>
  )
}
