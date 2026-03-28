'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LinearPushButton({
  signalId,
  existingUrl,
}: {
  signalId: string
  existingUrl: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    issueUrl: string
    identifier: string
  } | null>(null)

  if (existingUrl) {
    return (
      <a
        href={existingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent"
      >
        <LinearIcon />
        View in Linear
        <ExternalLinkIcon />
      </a>
    )
  }

  if (result) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={result.issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent/50"
        >
          <LinearIcon />
          {result.identifier}
          <ExternalLinkIcon />
        </a>
        <span className="text-xs text-dim">Issue created</span>
      </div>
    )
  }

  async function handlePush() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/signals/${signalId}/linear`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.status === 409 && data.issueUrl) {
        setResult({ issueUrl: data.issueUrl, identifier: '' })
        router.refresh()
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to push to Linear')
        return
      }

      setResult({
        issueUrl: data.issueUrl,
        identifier: data.identifier,
      })
      router.refresh()
    } catch {
      setError('Failed to push to Linear')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePush}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
      >
        <LinearIcon />
        {loading ? 'Pushing...' : 'Push to Linear'}
      </button>
      {error && <p className="text-xs text-sig-high">{error}</p>}
    </div>
  )
}

function LinearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 100 100"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M1.22541 61.5228c-.97401-2.6769-.97401-5.6497 0-8.3266L21.7122 6.55879C24.3769.664498 30.6488-1.32147 36.3419 1.14887l43.5387 17.88133c5.693 2.4704 8.4849 9.0693 6.0145 14.7624L65.4083 80.4299c-2.4703 5.693-9.0693 8.4849-14.7623 6.0145L7.10727 68.5631c-2.36675-.9713-4.24694-2.6839-5.45066-4.7977l-.43121-.2426zm57.62569 21.6052L47.3786 79.3587 14.8641 65.9124l-3.24549 8.1818c-.84618 2.1327-.00979 4.5622 1.97168 5.7246l.38781.218 39.3098 16.1413c4.0276 1.6541 8.6494-.2593 10.3035-4.2869l.5797-1.4588-.5199-1.3044zm-7.3282-1.7975L14.1593 63.9789l33.1154-13.1283 3.9141 9.8673-4.7221 11.9063 5.0566 2.0063zm8.1082-20.4379L30.4736 47.0946 40.791 21.0797l29.1579 11.5661-10.3175 26.0093.5201 1.3104-1.0001 2.5271zm6.7437-20.1005L37.2176 29.226l-4.2222 10.6434 29.1579 11.5661 4.2222-10.6435.9201 2.318 1.0001-2.527-2.1202-5.3428z" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
