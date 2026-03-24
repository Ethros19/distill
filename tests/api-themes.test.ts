import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFromResult = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: (cols?: unknown) => ({
      from: (table: unknown) => mockFromResult(),
    }),
  },
}))

vi.mock('@/lib/schema', () => ({
  syntheses: { id: 'id', periodEnd: 'period_end' },
  signals: {
    id: 'id',
    synthesisId: 'synthesis_id',
    statement: 'statement',
    reasoning: 'reasoning',
    evidence: 'evidence',
    suggestedAction: 'suggested_action',
    themes: 'themes',
    strength: 'strength',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => args,
  lte: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { GET as getThemes } from '@/app/api/themes/route'

// ---------------------------------------------------------------------------
// GET /api/themes tests
// ---------------------------------------------------------------------------

describe('GET /api/themes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns themes sorted by occurrence count', async () => {
    mockFromResult.mockReturnValueOnce([
      { themes: ['ui', 'accessibility'] },
      { themes: ['ui', 'performance'] },
      { themes: ['performance', 'auth'] },
    ])

    const response = await getThemes()
    const data = await response.json()

    expect(data.themes).toEqual([
      { name: 'ui', count: 2 },
      { name: 'performance', count: 2 },
      { name: 'accessibility', count: 1 },
      { name: 'auth', count: 1 },
    ])
  })

  it('returns empty array when no signals exist', async () => {
    mockFromResult.mockReturnValueOnce([])

    const response = await getThemes()
    const data = await response.json()

    expect(data.themes).toEqual([])
  })

  it('handles signals with null themes', async () => {
    mockFromResult.mockReturnValueOnce([
      { themes: ['ui'] },
      { themes: null },
      { themes: ['ui', 'auth'] },
    ])

    const response = await getThemes()
    const data = await response.json()

    expect(data.themes).toEqual([
      { name: 'ui', count: 2 },
      { name: 'auth', count: 1 },
    ])
  })

  it('counts duplicate themes across signals correctly', async () => {
    mockFromResult.mockReturnValueOnce([
      { themes: ['billing', 'billing'] }, // same theme repeated in one signal
      { themes: ['billing'] },
    ])

    const response = await getThemes()
    const data = await response.json()

    // Each occurrence is counted
    expect(data.themes).toEqual([{ name: 'billing', count: 3 }])
  })
})
