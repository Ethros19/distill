'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const expired = searchParams.get('expired') === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-4">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 20%, var(--accent-wash), transparent 60%)' }}
      />
      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="72"
            height="72"
            viewBox="0 0 32 32"
            className="mx-auto mb-6"
          >
            <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="var(--accent)" strokeWidth="0.75" opacity="0.25" />
            <circle cx="16" cy="16" r="2.5" fill="var(--accent)" />
            <circle cx="16" cy="2" r="1.5" fill="var(--accent)" opacity="0.5" />
            <circle cx="28.5" cy="20" r="1.5" fill="var(--accent)" opacity="0.35" />
            <circle cx="5" cy="23" r="1.5" fill="var(--accent)" opacity="0.25" />
          </svg>
          <h1 className="font-display text-5xl tracking-tight text-ink">Distill</h1>
          <p className="mt-3 text-sm tracking-wide text-dim">Signal Intelligence</p>
        </div>

        {expired && (
          <p className="mt-8 text-center text-sm text-sig-high">
            Your session has expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className={expired ? 'mt-5 space-y-5' : 'mt-12 space-y-5'}>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wider text-dim"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 block w-full rounded-lg border border-edge bg-panel px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-sig-high">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in\u2026' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
