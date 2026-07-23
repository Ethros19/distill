'use client'

import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'distill-help-seen'

export function HelpButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-2 py-1.5 text-sm text-dim transition-colors hover:bg-panel-alt hover:text-ink"
        aria-label="Help"
      >
        ?
      </button>
      <HelpModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    function handleClose() {
      onClose()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-md rounded-xl border border-edge bg-panel p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">How to use Distill</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-alt hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ol className="mt-5 space-y-4 text-sm text-dim">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-medium text-accent">
              1
            </span>
            <div>
              <p className="font-medium text-ink">Add feedback</p>
              <p className="mt-0.5">
                Click <span className="font-medium text-ink">+ Add Feedback</span> to
                paste customer quotes, support tickets, or team observations.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-medium text-accent">
              2
            </span>
            <div>
              <p className="font-medium text-ink">Run a synthesis</p>
              <p className="mt-0.5">
                Hit <span className="font-medium text-ink">Run Synthesis</span> to let
                Distill analyze your inputs and surface patterns.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-medium text-accent">
              3
            </span>
            <div>
              <p className="font-medium text-ink">Review signals</p>
              <p className="mt-0.5">
                Signals are ranked by strength. Triage them with status
                filters&mdash;accept, reject, or mark for later.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-medium text-accent">
              4
            </span>
            <div>
              <p className="font-medium text-ink">Track themes</p>
              <p className="mt-0.5">
                The sidebar aggregates recurring themes across syntheses so you
                can spot trends over time.
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </dialog>
  )
}
