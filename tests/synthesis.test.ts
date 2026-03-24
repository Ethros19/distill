import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculatePeriod } from '@/lib/synthesis'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock db module
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockInsert = vi.fn()
const mockValues = vi.fn()
const mockReturning = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: (table: unknown) => ({ where: mockWhere }) }),
    insert: (table: unknown) => {
      mockInsert(table)
      return { values: (vals: unknown) => {
        mockValues(vals)
        return { returning: mockReturning }
      }}
    },
  },
}))

// Mock LLM provider factory
const mockSynthesize = vi.fn()
vi.mock('@/lib/llm/provider-factory', () => ({
  getLLMProvider: () => ({
    synthesize: mockSynthesize,
  }),
}))

// Mock schema (pass through real tables as identifiers for mock tracking)
vi.mock('@/lib/schema', () => ({
  inputs: Symbol('inputs'),
  syntheses: Symbol('syntheses'),
  signals: Symbol('signals'),
}))

// Mock drizzle-orm operators (they just return their args for test assertions)
vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => args,
  lt: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// calculatePeriod tests
// ---------------------------------------------------------------------------

describe('calculatePeriod', () => {
  it('returns 7-day window ending at provided now', () => {
    const now = new Date('2026-03-24T09:00:00Z')
    const { periodStart, periodEnd } = calculatePeriod(now)

    expect(periodEnd).toEqual(now)
    expect(periodStart).toEqual(new Date('2026-03-17T09:00:00Z'))
  })

  it('defaults to current time when no now provided', () => {
    const before = Date.now()
    const { periodStart, periodEnd } = calculatePeriod()
    const after = Date.now()

    expect(periodEnd.getTime()).toBeGreaterThanOrEqual(before)
    expect(periodEnd.getTime()).toBeLessThanOrEqual(after)

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const diff = periodEnd.getTime() - periodStart.getTime()
    expect(diff).toBe(sevenDaysMs)
  })

  it('handles month boundaries correctly', () => {
    const now = new Date('2026-04-03T09:00:00Z')
    const { periodStart, periodEnd } = calculatePeriod(now)

    expect(periodEnd).toEqual(now)
    expect(periodStart).toEqual(new Date('2026-03-27T09:00:00Z'))
  })
})

// ---------------------------------------------------------------------------
// runSynthesis tests
// ---------------------------------------------------------------------------

describe('runSynthesis', () => {
  // Import dynamically after mocks are set up
  let runSynthesis: typeof import('@/lib/synthesis').runSynthesis

  beforeEach(async () => {
    vi.clearAllMocks()

    // Re-import to pick up mocks
    const mod = await import('@/lib/synthesis')
    runSynthesis = mod.runSynthesis
  })

  // -------------------------------------------------------------------------
  // Zero-input guard
  // -------------------------------------------------------------------------

  describe('zero-input guard', () => {
    it('returns skipped when DB returns 0 inputs', async () => {
      mockWhere.mockResolvedValueOnce([])

      const result = await runSynthesis()

      expect(result).toEqual({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
      })

      // No LLM call
      expect(mockSynthesize).not.toHaveBeenCalled()
      // No DB inserts
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Successful synthesis
  // -------------------------------------------------------------------------

  describe('successful synthesis', () => {
    const mockInputRows = [
      {
        id: 'input-1',
        summary: 'Users want dark mode',
        type: 'feature_request',
        themes: ['ui', 'accessibility'],
        urgency: 3,
        source: 'email',
        status: 'processed',
        createdAt: new Date('2026-03-20T10:00:00Z'),
      },
      {
        id: 'input-2',
        summary: 'Login is slow',
        type: 'bug_report',
        themes: ['performance'],
        urgency: 4,
        source: 'paste',
        status: 'processed',
        createdAt: new Date('2026-03-21T10:00:00Z'),
      },
      {
        id: 'input-3',
        summary: 'Love the new dashboard',
        type: 'praise',
        themes: ['ui', 'dashboard'],
        urgency: 1,
        source: 'email',
        status: 'processed',
        createdAt: new Date('2026-03-22T10:00:00Z'),
      },
    ]

    const mockLLMSignals = [
      {
        statement: 'UI improvements are a top priority',
        reasoning: 'Multiple users mentioned UI-related feedback',
        evidence: ['input-1', 'input-3'],
        suggested_action: 'Prioritize dark mode and dashboard enhancements',
        themes: ['ui', 'accessibility', 'dashboard'],
        strength: 2,
      },
      {
        statement: 'Performance issues need attention',
        reasoning: 'Login slowness reported with high urgency',
        evidence: ['input-2'],
        suggested_action: 'Investigate login performance bottlenecks',
        themes: ['performance'],
        strength: 1,
      },
    ]

    const mockSynthesisRecord = {
      id: 'synthesis-uuid-1',
      createdAt: new Date(),
      periodStart: new Date('2026-03-17T09:00:00Z'),
      periodEnd: new Date('2026-03-24T09:00:00Z'),
      inputCount: 3,
      signalCount: 2,
      digestMarkdown: null,
      trigger: 'cron',
    }

    beforeEach(() => {
      mockWhere.mockResolvedValueOnce(mockInputRows)
      mockSynthesize.mockResolvedValueOnce(mockLLMSignals)
      mockReturning.mockResolvedValueOnce([mockSynthesisRecord])
    })

    it('returns completed with correct counts', async () => {
      const result = await runSynthesis({ trigger: 'cron' })

      expect(result).toEqual({
        status: 'completed',
        synthesisId: 'synthesis-uuid-1',
        signalCount: 2,
        inputCount: 3,
      })
    })

    it('calls LLM synthesize with mapped inputs', async () => {
      await runSynthesis({ trigger: 'cron' })

      expect(mockSynthesize).toHaveBeenCalledOnce()
      const [synthesisInputs] = mockSynthesize.mock.calls[0]

      expect(synthesisInputs).toHaveLength(3)
      expect(synthesisInputs[0]).toEqual({
        id: 'input-1',
        summary: 'Users want dark mode',
        type: 'feature_request',
        themes: ['ui', 'accessibility'],
        urgency: 3,
        source: 'email',
      })
    })

    it('inserts synthesis record with trigger cron', async () => {
      await runSynthesis({ trigger: 'cron' })

      // First insert call is for the synthesis record
      const firstInsertValues = mockValues.mock.calls[0][0]
      expect(firstInsertValues.inputCount).toBe(3)
      expect(firstInsertValues.signalCount).toBe(2)
      expect(firstInsertValues.trigger).toBe('cron')
    })

    it('inserts correct signal records', async () => {
      await runSynthesis({ trigger: 'cron' })

      // Total insert calls: 1 synthesis + 2 signals = 3
      expect(mockValues).toHaveBeenCalledTimes(3)

      // Signal 1
      const signal1Values = mockValues.mock.calls[1][0]
      expect(signal1Values.synthesisId).toBe('synthesis-uuid-1')
      expect(signal1Values.statement).toBe('UI improvements are a top priority')
      expect(signal1Values.reasoning).toBe('Multiple users mentioned UI-related feedback')
      expect(signal1Values.evidence).toEqual(['input-1', 'input-3'])
      expect(signal1Values.suggestedAction).toBe('Prioritize dark mode and dashboard enhancements')
      expect(signal1Values.themes).toEqual(['ui', 'accessibility', 'dashboard'])
      expect(signal1Values.strength).toBe(2)

      // Signal 2
      const signal2Values = mockValues.mock.calls[2][0]
      expect(signal2Values.synthesisId).toBe('synthesis-uuid-1')
      expect(signal2Values.statement).toBe('Performance issues need attention')
      expect(signal2Values.evidence).toEqual(['input-2'])
      expect(signal2Values.strength).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // DB write verification
  // -------------------------------------------------------------------------

  describe('database persistence', () => {
    const mockInputRows = [
      {
        id: 'input-a',
        summary: 'Feature A',
        type: 'feature_request',
        themes: ['billing'],
        urgency: 2,
        source: 'email',
        status: 'processed',
        createdAt: new Date('2026-03-20T10:00:00Z'),
      },
      {
        id: 'input-b',
        summary: 'Bug B',
        type: 'bug_report',
        themes: ['auth'],
        urgency: 5,
        source: 'paste',
        status: 'processed',
        createdAt: new Date('2026-03-21T10:00:00Z'),
      },
    ]

    const mockLLMSignals = [
      {
        statement: 'Auth reliability is critical',
        reasoning: 'High urgency auth bug reported',
        evidence: ['input-b'],
        suggested_action: 'Audit auth flow',
        themes: ['auth', 'reliability'],
        strength: 1,
      },
    ]

    const mockSynthesisRecord = {
      id: 'synthesis-uuid-2',
      createdAt: new Date(),
      periodStart: new Date('2026-03-17T09:00:00Z'),
      periodEnd: new Date('2026-03-24T09:00:00Z'),
      inputCount: 2,
      signalCount: 1,
      digestMarkdown: null,
      trigger: 'cron',
    }

    beforeEach(() => {
      mockWhere.mockResolvedValueOnce(mockInputRows)
      mockSynthesize.mockResolvedValueOnce(mockLLMSignals)
      mockReturning.mockResolvedValueOnce([mockSynthesisRecord])
    })

    it('synthesis record contains correct period and counts', async () => {
      const now = new Date('2026-03-24T09:00:00Z')
      await runSynthesis({ trigger: 'cron', now })

      const synthesisValues = mockValues.mock.calls[0][0]
      expect(synthesisValues.periodStart).toEqual(new Date('2026-03-17T09:00:00Z'))
      expect(synthesisValues.periodEnd).toEqual(new Date('2026-03-24T09:00:00Z'))
      expect(synthesisValues.inputCount).toBe(2)
      expect(synthesisValues.signalCount).toBe(1)
      expect(synthesisValues.trigger).toBe('cron')
    })

    it('signal record maps suggested_action to suggestedAction', async () => {
      await runSynthesis({ trigger: 'cron' })

      const signalValues = mockValues.mock.calls[1][0]
      expect(signalValues.suggestedAction).toBe('Audit auth flow')
      expect(signalValues.themes).toEqual(['auth', 'reliability'])
    })

    it('signal evidence is stored as array of input IDs', async () => {
      await runSynthesis({ trigger: 'cron' })

      const signalValues = mockValues.mock.calls[1][0]
      expect(Array.isArray(signalValues.evidence)).toBe(true)
      expect(signalValues.evidence).toEqual(['input-b'])
    })

    it('signal themes is stored as array of strings', async () => {
      await runSynthesis({ trigger: 'cron' })

      const signalValues = mockValues.mock.calls[1][0]
      expect(Array.isArray(signalValues.themes)).toBe(true)
      expect(signalValues.themes).toEqual(['auth', 'reliability'])
    })

    it('supports manual trigger type', async () => {
      await runSynthesis({ trigger: 'manual' })

      const synthesisValues = mockValues.mock.calls[0][0]
      expect(synthesisValues.trigger).toBe('manual')
    })

    it('defaults trigger to cron when not specified', async () => {
      await runSynthesis()

      const synthesisValues = mockValues.mock.calls[0][0]
      expect(synthesisValues.trigger).toBe('cron')
    })
  })
})
