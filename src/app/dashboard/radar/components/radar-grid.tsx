'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { SerializedStreamBrief } from './stream-briefing'
import { StreamBriefing } from './stream-briefing'

const STORAGE_KEY = 'distill-radar-order'

function GripIcon() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      className="text-muted transition-colors group-hover/grip:text-accent"
      aria-hidden="true"
    >
      <circle cx="2.5" cy="2.5" r="1.2" />
      <circle cx="7.5" cy="2.5" r="1.2" />
      <circle cx="2.5" cy="7.5" r="1.2" />
      <circle cx="7.5" cy="7.5" r="1.2" />
      <circle cx="2.5" cy="12.5" r="1.2" />
      <circle cx="7.5" cy="12.5" r="1.2" />
    </svg>
  )
}

export function RadarGrid({ briefs }: { briefs: SerializedStreamBrief[] }) {
  // Reorder briefs based on saved order
  const [order, setOrder] = useState<string[]>(() => {
    return briefs.map((b) => b.stream)
  })
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)

  // Load saved order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        // Validate: must contain same streams
        const briefStreams = new Set(briefs.map((b) => b.stream))
        if (parsed.length === briefStreams.size && parsed.every((s) => briefStreams.has(s))) {
          setOrder(parsed)
        }
      }
    } catch {
      // Ignore invalid localStorage
    }
  }, [briefs])

  const ordered = order
    .map((stream) => briefs.find((b) => b.stream === stream))
    .filter((b): b is SerializedStreamBrief => b != null)

  const saveOrder = useCallback((newOrder: string[]) => {
    setOrder(newOrder)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
    } catch {
      // localStorage full or unavailable
    }
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, idx: number) => {
      setDragIdx(idx)
      dragNode.current = e.currentTarget
      e.dataTransfer.effectAllowed = 'move'
      // Delay opacity so the drag image captures properly
      requestAnimationFrame(() => {
        if (dragNode.current) {
          dragNode.current.style.opacity = '0.4'
        }
      })
    },
    [],
  )

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1'
    }
    setDragIdx(null)
    setOverIdx(null)
    dragNode.current = null
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, idx: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragIdx !== null && idx !== dragIdx) {
        setOverIdx(idx)
      }
    },
    [dragIdx],
  )

  const handleDragLeave = useCallback(() => {
    setOverIdx(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIdx: number) => {
      e.preventDefault()
      if (dragIdx === null || dragIdx === dropIdx) return

      const newOrder = [...order]
      const [removed] = newOrder.splice(dragIdx, 1)
      newOrder.splice(dropIdx, 0, removed)
      saveOrder(newOrder)
      setOverIdx(null)
    },
    [dragIdx, order, saveOrder],
  )

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ordered.map((brief, i) => {
        const isDragging = dragIdx === i
        const isOver = overIdx === i

        return (
          <div
            key={brief.stream}
            className={`relative rounded-2xl border-2 border-dashed p-1.5 transition-all duration-200 ${
              isOver
                ? 'border-accent/50 bg-accent/5'
                : isDragging
                  ? 'border-edge-dim bg-transparent'
                  : 'border-transparent'
            }`}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
          >
            {/* Drag handle */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, i)}
              onDragEnd={handleDragEnd}
              className="group/grip absolute right-3 top-3 z-10 cursor-grab rounded-md p-1.5 transition-colors hover:bg-panel-alt active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripIcon />
            </div>

            <StreamBriefing brief={brief} index={i} />
          </div>
        )
      })}
    </div>
  )
}
