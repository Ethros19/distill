'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const phases = [
  'Gathering inputs\u2026',
  'Extracting themes\u2026',
  'Clustering patterns\u2026',
  'Weighing evidence\u2026',
  'Synthesizing signals\u2026',
]

export function SynthesisOverlay({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!active) {
      setPhase(0)
      return
    }
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % phases.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-8">
        {/* Converging rings */}
        <div className="relative h-40 w-40">
          {/* Center dot */}
          <div
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
          />

          {/* Orbiting dots */}
          <div
            className="absolute inset-0"
            style={{ animation: 'orbit 6s linear infinite' }}
          >
            <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent/60" />
          </div>
          <div
            className="absolute inset-0"
            style={{
              animation: 'orbit 8s linear infinite reverse',
            }}
          >
            <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent/40" />
          </div>
          <div
            className="absolute inset-0"
            style={{ animation: 'orbit 10s linear infinite' }}
          >
            <div className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent/30" />
          </div>

          {/* Converging rings */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-accent/20"
              style={{
                animation: `converge 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
        </div>

        {/* Phase text */}
        <div className="text-center">
          <p className="font-display text-lg italic text-ink">Distilling</p>
          <p
            key={phase}
            className="mt-2 animate-fade-up text-sm text-dim"
          >
            {phases[phase]}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
