import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelectResult = vi.fn()
const mockInsertValues = vi.fn().mockResolvedValue(undefined)
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
const mockUpdateSet = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectResult(),
          orderBy: () => mockSelectResult(),
        }),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
    delete: () => {
      mockDelete()
      return {
        where: mockDeleteWhere,
        then(resolve: (v: unknown) => void) { resolve(undefined) },
      }
    },
    update: () => ({
      set: (data: unknown) => ({
        where: () => {
          mockUpdateSet(data)
          return Promise.resolve()
        },
      }),
    }),
  },
}))

vi.mock('@/lib/schema', () => ({
  sessions: {
    token: 'token',
    expiresAt: 'expires_at',
    lastActivityAt: 'last_activity_at',
  },
  loginAttempts: {
    ip: 'ip',
    success: 'success',
    attemptedAt: 'attempted_at',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  lt: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  gt: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}))

// Must mock bcryptjs to avoid it interfering
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { validateSession, createSession } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = Date.now()
const FOUR_HOURS = 4 * 60 * 60 * 1000
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

function makeSession(overrides: { expiresAt?: Date; lastActivityAt?: Date } = {}) {
  return {
    token: 'a'.repeat(64),
    createdAt: new Date(now - 60000),
    expiresAt: overrides.expiresAt ?? new Date(now + SEVEN_DAYS),
    lastActivityAt: overrides.lastActivityAt ?? new Date(now - 1000),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateSession — idle timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns valid for session with recent activity', async () => {
    mockSelectResult.mockResolvedValueOnce([makeSession()])
    const result = await validateSession('a'.repeat(64))
    expect(result).toEqual({ valid: true, expired: false })
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastActivityAt: expect.any(Date) }),
    )
  })

  it('returns expired for session idle > 4 hours', async () => {
    const oldActivity = new Date(now - FOUR_HOURS - 1000)
    mockSelectResult.mockResolvedValueOnce([makeSession({ lastActivityAt: oldActivity })])
    const result = await validateSession('a'.repeat(64))
    expect(result).toEqual({ valid: false, expired: true })
    expect(mockDeleteWhere).toHaveBeenCalled()
  })

  it('returns expired for session past absolute 7-day expiry', async () => {
    const pastExpiry = new Date(now - 1000)
    mockSelectResult.mockResolvedValueOnce([makeSession({ expiresAt: pastExpiry })])
    const result = await validateSession('a'.repeat(64))
    expect(result).toEqual({ valid: false, expired: true })
    expect(mockDeleteWhere).toHaveBeenCalled()
  })

  it('returns not valid (not expired) for non-existent session', async () => {
    mockSelectResult.mockResolvedValueOnce([])
    const result = await validateSession('b'.repeat(64))
    expect(result).toEqual({ valid: false, expired: false })
  })

  it('updates lastActivityAt for valid session', async () => {
    mockSelectResult.mockResolvedValueOnce([makeSession()])
    await validateSession('a'.repeat(64))
    expect(mockUpdateSet).toHaveBeenCalledTimes(1)
    const setArg = mockUpdateSet.mock.calls[0][0]
    expect(setArg.lastActivityAt).toBeInstanceOf(Date)
  })
})

describe('createSession — includes lastActivityAt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts session with lastActivityAt', async () => {
    const token = await createSession()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        lastActivityAt: expect.any(Date),
        expiresAt: expect.any(Date),
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Rate-limit integration tests (auth route wiring)
// ---------------------------------------------------------------------------

// These test checkRateLimit behavior as wired into the login flow.
// The auth route imports checkRateLimit, so we test the rate-limit module
// with login-realistic scenarios.

describe('rate-limit integration — login scenarios', () => {
  // We import from rate-limit directly and mock the DB layer to simulate
  // the auth route's usage of checkRateLimit + recordLoginAttempt.

  // Note: checkRateLimit and recordLoginAttempt are already tested in
  // rate-limit.test.ts. These tests verify the wiring expectations:
  // - 5+ failures within the window triggers a lockout
  // - After the lockout period, requests are allowed again

  it('blocks login after 5+ failed attempts (simulates 429 path)', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')

    // Mock DB to return 5 recent failures for the IP
    const recentFailures = Array.from({ length: 5 }, (_, i) => ({
      id: `fail-${i}`,
      ip: '10.0.0.1',
      attemptedAt: new Date(now - i * 1000), // all within last few seconds
      success: false,
    }))

    // checkRateLimit uses db.select().from().where().orderBy()
    mockSelectResult.mockResolvedValueOnce(recentFailures)

    const result = await checkRateLimit('10.0.0.1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.failedAttempts).toBe(5)
  })

  it('allows login after lockout period elapses', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')

    // 5 failures, but the most recent was 2 minutes ago (lockout is 60s for 5 attempts)
    const oldFailures = Array.from({ length: 5 }, (_, i) => ({
      id: `fail-${i}`,
      ip: '10.0.0.1',
      attemptedAt: new Date(now - 2 * 60 * 1000 - i * 1000), // 2+ minutes ago
      success: false,
    }))

    mockSelectResult.mockResolvedValueOnce(oldFailures)

    const result = await checkRateLimit('10.0.0.1')

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
    expect(result.failedAttempts).toBe(5)
  })
})
