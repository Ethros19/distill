import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { middleware, isValidOrigin } from '@/middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOST = 'localhost:3000'
const BASE_URL = `http://${HOST}`

function makeRequest(
  path: string,
  method: string,
  headers: Record<string, string> = {},
  cookie?: string,
): NextRequest {
  const url = `${BASE_URL}${path}`
  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  })
  if (cookie) {
    req.cookies.set('session', cookie)
  }
  return req
}

// ---------------------------------------------------------------------------
// Tests: CSRF Origin Validation
// ---------------------------------------------------------------------------

describe('CSRF Origin Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET requests pass CSRF check (no Origin needed)', () => {
    const req = makeRequest('/dashboard', 'GET')
    expect(isValidOrigin(req)).toBe(true)
  })

  it('HEAD requests pass CSRF check', () => {
    const req = makeRequest('/dashboard', 'HEAD')
    expect(isValidOrigin(req)).toBe(true)
  })

  it('OPTIONS requests pass CSRF check (preflight)', () => {
    const req = makeRequest('/api/inputs', 'OPTIONS')
    expect(isValidOrigin(req)).toBe(true)
  })

  it('POST request with matching Origin header passes', () => {
    const req = makeRequest('/api/inputs', 'POST', {
      origin: BASE_URL,
    })
    expect(isValidOrigin(req)).toBe(true)
  })

  it('POST request with mismatched Origin is rejected', () => {
    const req = makeRequest('/api/inputs', 'POST', {
      origin: 'http://evil.com',
    })
    expect(isValidOrigin(req)).toBe(false)
  })

  it('POST request with no Origin but valid Referer passes', () => {
    const req = makeRequest('/api/inputs', 'POST', {
      referer: `${BASE_URL}/dashboard`,
    })
    expect(isValidOrigin(req)).toBe(true)
  })

  it('POST request with no Origin and no Referer is rejected', () => {
    const req = makeRequest('/api/inputs', 'POST')
    expect(isValidOrigin(req)).toBe(false)
  })

  it('POST request with no Origin and mismatched Referer is rejected', () => {
    const req = makeRequest('/api/inputs', 'POST', {
      referer: 'http://evil.com/page',
    })
    expect(isValidOrigin(req)).toBe(false)
  })

  it('DELETE request with valid Origin passes', () => {
    const req = makeRequest('/api/auth', 'DELETE', {
      origin: BASE_URL,
    })
    expect(isValidOrigin(req)).toBe(true)
  })

  it('PUT request with mismatched Origin is rejected', () => {
    const req = makeRequest('/api/synthesis', 'PUT', {
      origin: 'http://attacker.com',
    })
    expect(isValidOrigin(req)).toBe(false)
  })

  it('PATCH request with no Origin and invalid Referer URL is rejected', () => {
    const req = makeRequest('/api/inputs', 'PATCH', {
      referer: 'not-a-valid-url',
    })
    expect(isValidOrigin(req)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: Middleware integration (CSRF + session)
// ---------------------------------------------------------------------------

describe('Middleware CSRF integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 for POST with mismatched Origin', async () => {
    const req = makeRequest('/api/inputs', 'POST', {
      origin: 'http://evil.com',
    }, 'valid-session-token')
    const res = await middleware(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Forbidden')
  })

  it('returns 403 for POST with no Origin and no Referer', async () => {
    const req = makeRequest('/api/inputs', 'POST', {}, 'valid-session-token')
    const res = await middleware(req)
    expect(res.status).toBe(403)
  })

  it('/api/auth POST with valid Origin skips session validation', async () => {
    const req = makeRequest('/api/auth', 'POST', {
      origin: BASE_URL,
    })
    const res = await middleware(req)
    expect(res.status).toBe(200)
    // validateSession should not have been called
    const { validateSession } = await import('@/lib/auth')
    expect(validateSession).not.toHaveBeenCalled()
  })

  it('/api/auth POST with bad Origin is still rejected with 403', async () => {
    const req = makeRequest('/api/auth', 'POST', {
      origin: 'http://evil.com',
    })
    const res = await middleware(req)
    expect(res.status).toBe(403)
  })
})
