'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'

// ---------------------------------------------------------------------------
// Capture context — shared modal state between selection + button captures
// ---------------------------------------------------------------------------

interface CaptureState {
  open: boolean
  text: string
  context: string // e.g. "VC & Investment — Brief"
}

const CaptureCtx = createContext<{
  capture: (text: string, context: string) => void
}>({ capture: () => {} })

export function useCapture() {
  return useContext(CaptureCtx)
}

// ---------------------------------------------------------------------------
// CaptureButton — small icon for per-section capture
// ---------------------------------------------------------------------------

export function CaptureButton({
  text,
  context,
  className = '',
}: {
  text: string
  context: string
  className?: string
}) {
  const { capture } = useCapture()
  return (
    <button
      onClick={() => capture(text, context)}
      className={`shrink-0 rounded p-1 text-muted/50 transition-colors hover:bg-panel-alt hover:text-accent ${className}`}
      title="Capture as internal input"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v4M14 4h-4" />
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// CaptureModal — submission popover
// ---------------------------------------------------------------------------

function CaptureModal({
  state,
  onClose,
}: {
  state: CaptureState
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'success' | 'duplicate' | 'error' | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (state.open) {
      setNote('')
      setResult(null)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [state.open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (state.open) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [state.open, onClose])

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setResult(null)

    const content = note
      ? `[Radar Capture — ${state.context}]\n\n${state.text}\n\n---\nNote: ${note}`
      : `[Radar Capture — ${state.context}]\n\n${state.text}`

    try {
      const res = await fetch('/api/intake/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source: 'radar-capture',
          contributor: 'internal',
        }),
      })
      if (res.ok) {
        setResult('success')
        setTimeout(onClose, 1200)
      } else if (res.status === 409) {
        setResult('duplicate')
      } else {
        setResult('error')
      }
    } catch {
      setResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!state.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-edge bg-panel p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Capture to Inputs</h3>
          <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {state.context}
          </span>
        </div>

        {/* Selected text preview */}
        <div className="mb-3 max-h-32 overflow-y-auto rounded-lg border border-edge-dim bg-panel-alt px-3 py-2 text-xs leading-relaxed text-dim">
          {state.text.length > 500 ? state.text.slice(0, 500) + '...' : state.text}
        </div>

        {/* Note field */}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why is this important? (optional — helps the structurer assign higher urgency)"
          rows={2}
          className="mb-3 w-full resize-none rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent/40 focus:outline-none"
        />

        {/* Result feedback */}
        {result === 'success' && (
          <p className="mb-3 text-xs font-medium text-sig-low">
            Captured — will be structured and queued for next synthesis.
          </p>
        )}
        {result === 'duplicate' && (
          <p className="mb-3 text-xs font-medium text-sig-mid">
            This content was already captured.
          </p>
        )}
        {result === 'error' && (
          <p className="mb-3 text-xs font-medium text-sig-high">
            Failed to capture. Try again.
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || result === 'success'}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Capturing...' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectionCapture — floating button on text selection
// ---------------------------------------------------------------------------

function SelectionCapture({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { capture } = useCapture()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleMouseUp = useCallback(() => {
    // Small delay so the selection finalizes
    requestAnimationFrame(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setPos(null)
        return
      }

      const text = selection.toString().trim()
      if (text.length < 10) {
        setPos(null)
        return
      }

      // Only capture selections within our container
      const range = selection.getRangeAt(0)
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setPos(null)
        return
      }

      const rect = range.getBoundingClientRect()
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
      setSelectedText(text)
    })
  }, [containerRef])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // If clicking the capture button, don't dismiss
      if (buttonRef.current?.contains(e.target as Node)) return
      setPos(null)
    },
    [],
  )

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseUp, handleMouseDown])

  if (!pos) return null

  return (
    <button
      ref={buttonRef}
      onClick={() => {
        capture(selectedText, 'Selected text')
        setPos(null)
        window.getSelection()?.removeAllRanges()
      }}
      className="fixed z-40 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs font-medium text-ink shadow-lg transition-colors hover:bg-accent hover:text-white"
      style={{ left: pos.x, top: pos.y }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v4M14 4h-4" />
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
      </svg>
      Capture
    </button>
  )
}

// ---------------------------------------------------------------------------
// RadarCaptureProvider — wraps radar content with both capture mechanisms
// ---------------------------------------------------------------------------

export function RadarCaptureProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [captureState, setCaptureState] = useState<CaptureState>({
    open: false,
    text: '',
    context: '',
  })

  const capture = useCallback((text: string, context: string) => {
    setCaptureState({ open: true, text, context })
  }, [])

  const close = useCallback(() => {
    setCaptureState((s) => ({ ...s, open: false }))
  }, [])

  return (
    <CaptureCtx.Provider value={{ capture }}>
      <div ref={containerRef}>
        {children}
        <SelectionCapture containerRef={containerRef} />
      </div>
      <CaptureModal state={captureState} onClose={close} />
    </CaptureCtx.Provider>
  )
}
