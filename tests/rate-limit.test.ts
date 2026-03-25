import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOrderBy = vi.fn()
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockInsertValues = vi.fn()
const mockDeleteWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockSelectWhere,
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
  },
}))

vi.mock('@/lib/schema', () => ({
  loginAttempts: {
    ip: 'ip',
    success: 'success',
    attemptedAt: 'attempted_at',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  lt: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { checkRateLimit, recordLoginAttempt, cleanOldAttempts } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAttempts(count: number, minutesAgo: number = 0) {
  const attempts = []
  for (let i = 0; i < count; i++) {
    attempts.push({
      id: `id-${i}`,
      ip: '192.168.1.1',
      attemptedAt: new Date(Date.now() - minutesAgo * 60 * 1000 - i * 1000),
      success: false,
    })
  }
  return attempts
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows when fewer than 5 failed attempts', async () => {
    mockOrderBy.mockResolvedValueOnce(makeAttempts(3))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
    expect(result.failedAttempts).toBe(3)
  })

  it('locks out with ~60s retry-after when 5 failed attempts within 1 minute', async () => {
    // 5 failures, most recent just now (0 minutes ago)
    mockOrderBy.mockResolvedValueOnce(makeAttempts(5, 0))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(50)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60)
    expect(result.failedAttempts).toBe(5)
  })

  it('allows when 5 failed attempts but lockout period has elapsed (> 1 min ago)', async () => {
    // 5 failures, most recent 2 minutes ago
    mockOrderBy.mockResolvedValueOnce(makeAttempts(5, 2))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
    expect(result.failedAttempts).toBe(5)
  })

  it('locks out with ~5 min retry-after when 10 failed attempts', async () => {
    // 10 failures, most recent just now
    mockOrderBy.mockResolvedValueOnce(makeAttempts(10, 0))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(290)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(300)
    expect(result.failedAttempts).toBe(10)
  })

  it('locks out with ~15 min retry-after when 20 failed attempts', async () => {
    // 20 failures, most recent just now
    mockOrderBy.mockResolvedValueOnce(makeAttempts(20, 0))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(890)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(900)
    expect(result.failedAttempts).toBe(20)
  })

  it('allows when no attempts exist', async () => {
    mockOrderBy.mockResolvedValueOnce([])

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
    expect(result.failedAttempts).toBe(0)
  })
})

describe('recordLoginAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a failed login attempt', async () => {
    mockInsertValues.mockResolvedValueOnce(undefined)

    await recordLoginAttempt('192.168.1.1', false)

    expect(mockInsertValues).toHaveBeenCalledWith({
      ip: '192.168.1.1',
      success: false,
    })
  })

  it('records a successful login attempt', async () => {
    mockInsertValues.mockResolvedValueOnce(undefined)

    await recordLoginAttempt('10.0.0.1', true)

    expect(mockInsertValues).toHaveBeenCalledWith({
      ip: '10.0.0.1',
      success: true,
    })
  })
})

describe('cleanOldAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes attempts older than 24 hours', async () => {
    mockDeleteWhere.mockResolvedValueOnce(undefined)

    await cleanOldAttempts()

    expect(mockDeleteWhere).toHaveBeenCalled()
  })
})
