import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelectLimit = vi.fn()
const mockUpdateSet = vi.fn()
const mockUpdateWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: mockSelectLimit }),
      }),
    }),
    update: () => ({
      set: (vals: unknown) => {
        mockUpdateSet(vals)
        return { where: mockUpdateWhere }
      },
    }),
  },
}))

vi.mock('@/lib/schema', () => ({
  inputs: { id: Symbol('inputs.id'), status: Symbol('inputs.status') },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

const mockStructureInput = vi.fn()
vi.mock('@/lib/structurer', () => ({
  structureInput: (...args: unknown[]) => mockStructureInput(...args),
}))

vi.mock('@/lib/providers/anthropic', () => ({
  AnthropicProvider: class {},
}))

vi.mock('@/lib/auth', () => ({
  cleanExpiredSessions: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  cleanOldAttempts: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = 'test-cron-secret'

function request(auth?: string) {
  return new NextRequest('http://localhost/api/cron/daily', {
    headers: auth ? { authorization: auth } : {},
  })
}

function input(id: string) {
  return { id, rawContent: 'same text', source: 'rss', contributor: 'Feed' }
}

const structured = {
  summary: 'A summary',
  type: 'observation',
  themes: ['theme'],
  urgency: 1,
  confidence: 0.7,
  is_feedback: false,
  content_hash: 'hash-of-raw-content',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/daily', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    mockStructureInput.mockResolvedValue(structured)
    mockUpdateWhere.mockResolvedValue(undefined)
  })

  it('rejects requests without the cron secret', async () => {
    const { GET } = await import('@/app/api/cron/daily/route')
    const res = await GET(request())

    expect(res.status).toBe(401)
    expect(mockSelectLimit).not.toHaveBeenCalled()
  })

  it('marks structured inputs as processed', async () => {
    mockSelectLimit.mockResolvedValue([input('a')])

    const { GET } = await import('@/app/api/cron/daily/route')
    const res = await GET(request(`Bearer ${SECRET}`))

    expect(await res.json()).toEqual({ processed: 1, failed: 0, total: 1 })
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'A summary', status: 'processed' }),
    )
  })

  it('does not rewrite the content hash assigned at intake', async () => {
    // Two feed items with identical text have different intake hashes (their
    // URLs). Rewriting the hash from the text would make the second one
    // violate the unique index and stay unprocessed forever.
    mockSelectLimit.mockResolvedValue([input('a'), input('b')])

    const { GET } = await import('@/app/api/cron/daily/route')
    const res = await GET(request(`Bearer ${SECRET}`))

    expect(await res.json()).toEqual({ processed: 2, failed: 0, total: 2 })
    expect(mockUpdateSet).toHaveBeenCalledTimes(2)
    for (const [vals] of mockUpdateSet.mock.calls) {
      expect(vals).not.toHaveProperty('contentHash')
    }
  })

  it('counts a failed input and carries on with the rest', async () => {
    mockSelectLimit.mockResolvedValue([input('a'), input('b')])
    mockStructureInput.mockRejectedValueOnce(new Error('LLM down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { GET } = await import('@/app/api/cron/daily/route')
    const res = await GET(request(`Bearer ${SECRET}`))

    expect(await res.json()).toEqual({ processed: 1, failed: 1, total: 2 })
    errorSpy.mockRestore()
  })
})
