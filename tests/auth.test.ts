import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

// bcrypt hash of "test-password-123" (cost 12)
const TEST_HASH = '$2b$12$yEOWBnZ6Dxcx7iAStT3wSO8g9NpFcesFJBeiNVCrrQ2kmofgU/wDK'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsertValues = vi.fn().mockResolvedValue(undefined)
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
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
  },
}))

vi.mock('@/lib/schema', () => ({
  sessions: { token: 'token', expiresAt: 'expires_at' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  lt: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { verifyPassword, deleteAllSessions, createSession } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verifyPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true for correct password against bcrypt hash', async () => {
    process.env.AUTH_PASSWORD_HASH = TEST_HASH
    const result = await verifyPassword('test-password-123')
    expect(result).toBe(true)
  })

  it('returns false for wrong password', async () => {
    process.env.AUTH_PASSWORD_HASH = TEST_HASH
    const result = await verifyPassword('wrong-password')
    expect(result).toBe(false)
  })

  it('throws when AUTH_PASSWORD_HASH is not set', async () => {
    delete process.env.AUTH_PASSWORD_HASH
    await expect(verifyPassword('any-password')).rejects.toThrow(
      'AUTH_PASSWORD_HASH environment variable not set',
    )
  })
})

describe('deleteAllSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls db.delete on sessions table', async () => {
    await deleteAllSessions()
    expect(mockDelete).toHaveBeenCalled()
  })
})

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a valid 64-char hex token', async () => {
    const token = await createSession()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('inserts session into the database', async () => {
    await createSession()
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      }),
    )
  })
})
