import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        orderBy: (col: unknown) => ({
          limit: mockLimit,
        }),
        where: (cond: unknown) => ({
          orderBy: mockOrderBy,
        }),
      }),
    }),
  },
}))

const mockRunSynthesis = vi.fn()
vi.mock('@/lib/synthesis', () => ({
  runSynthesis: (...args: unknown[]) => mockRunSynthesis(...args),
}))

vi.mock('@/lib/schema', () => ({
  syntheses: { id: 'id', createdAt: 'created_at', synthesisId: 'synthesis_id' },
  signals: { synthesisId: 'synthesis_id', strength: 'strength' },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { GET, POST } from '@/app/api/synthesis/route'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/synthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null synthesis when DB is empty', async () => {
    mockLimit.mockResolvedValueOnce([])

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual({ synthesis: null, signals: [] })
  })

  it('returns latest synthesis with signals sorted by strength', async () => {
    const mockSynthesis = {
      id: 'synth-1',
      createdAt: '2026-03-24T09:00:00Z',
      periodStart: '2026-03-17T09:00:00Z',
      periodEnd: '2026-03-24T09:00:00Z',
      inputCount: 5,
      signalCount: 2,
      trigger: 'cron',
    }

    const mockSignals = [
      { id: 'sig-1', statement: 'Signal A', strength: 5 },
      { id: 'sig-2', statement: 'Signal B', strength: 3 },
    ]

    mockLimit.mockResolvedValueOnce([mockSynthesis])
    mockOrderBy.mockResolvedValueOnce(mockSignals)

    const response = await GET()
    const data = await response.json()

    expect(data.synthesis).toEqual(mockSynthesis)
    expect(data.signals).toEqual(mockSignals)
  })
})

describe('POST /api/synthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls runSynthesis with trigger=manual and returns result', async () => {
    const mockResult = {
      status: 'completed',
      synthesisId: 'synth-2',
      signalCount: 3,
      inputCount: 10,
    }

    mockRunSynthesis.mockResolvedValueOnce(mockResult)

    const response = await POST()
    const data = await response.json()

    expect(mockRunSynthesis).toHaveBeenCalledWith({ trigger: 'manual' })
    expect(data).toEqual(mockResult)
  })

  it('returns 500 on synthesis error', async () => {
    mockRunSynthesis.mockRejectedValueOnce(new Error('LLM provider unavailable'))

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('LLM provider unavailable')
  })
})
