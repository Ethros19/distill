import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock runSynthesis
const mockRunSynthesis = vi.fn()
vi.mock('@/lib/synthesis', () => ({
  runSynthesis: (...args: unknown[]) => mockRunSynthesis(...args),
}))

// Mock digest module
const mockRenderDigest = vi.fn()
const mockDigestToHtml = vi.fn()
vi.mock('@/lib/digest', () => ({
  renderDigest: (...args: unknown[]) => mockRenderDigest(...args),
  digestToHtml: (...args: unknown[]) => mockDigestToHtml(...args),
}))

// Mock email module
const mockSendDigestEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendDigestEmail: (...args: unknown[]) => mockSendDigestEmail(...args),
}))

// Mock db module
const mockDbSelectWhere = vi.fn()
const mockDbUpdateSet = vi.fn()
const mockDbUpdateWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: mockDbSelectWhere,
      }),
    }),
    update: () => ({
      set: (vals: unknown) => {
        mockDbUpdateSet(vals)
        return { where: mockDbUpdateWhere }
      },
    }),
  },
}))

// Mock schema
vi.mock('@/lib/schema', () => ({
  signals: { synthesisId: Symbol('signals.synthesisId') },
  syntheses: { id: Symbol('syntheses.id') },
}))

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => args,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) {
    headers.set('authorization', authHeader)
  }
  return new NextRequest('http://localhost/api/cron/weekly', { headers })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Weekly cron route', () => {
  let GET: typeof import('@/app/api/cron/weekly/route').GET

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'

    const mod = await import('@/app/api/cron/weekly/route')
    GET = mod.GET
  })

  // -------------------------------------------------------------------------
  // Auth tests
  // -------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when no Authorization header', async () => {
      const response = await GET(makeRequest())
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('returns 401 when wrong bearer token', async () => {
      const response = await GET(makeRequest('Bearer wrong-token'))
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('proceeds with valid auth', async () => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
      })

      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.status).toBe('skipped')
    })
  })

  // -------------------------------------------------------------------------
  // Skip flow tests
  // -------------------------------------------------------------------------

  describe('skip flow (zero-input guard)', () => {
    it('returns skip response when no inputs in period', async () => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
      })

      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
        signalCount: 0,
        digestSent: false,
      })
    })

    it('does not call renderDigest when skipped', async () => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
      })

      await GET(makeRequest('Bearer test-secret'))
      expect(mockRenderDigest).not.toHaveBeenCalled()
    })

    it('does not call sendDigestEmail when skipped', async () => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'skipped',
        reason: 'no inputs in period',
        inputCount: 0,
      })

      await GET(makeRequest('Bearer test-secret'))
      expect(mockSendDigestEmail).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Complete flow tests
  // -------------------------------------------------------------------------

  describe('complete flow', () => {
    const mockSignalRows = [
      {
        id: 'signal-1',
        synthesisId: 'test-uuid',
        statement: 'Users want dark mode',
        reasoning: 'Multiple users requested it',
        evidence: ['input-1', 'input-2'],
        suggestedAction: 'Add dark mode toggle',
        themes: ['ui', 'accessibility'],
        strength: 2,
      },
      {
        id: 'signal-2',
        synthesisId: 'test-uuid',
        statement: 'Login is slow',
        reasoning: 'Reported with high urgency',
        evidence: ['input-3'],
        suggestedAction: 'Optimize auth flow',
        themes: ['performance'],
        strength: 1,
      },
      {
        id: 'signal-3',
        synthesisId: 'test-uuid',
        statement: 'Billing UX confusing',
        reasoning: 'Multiple complaints',
        evidence: ['input-4', 'input-5'],
        suggestedAction: 'Redesign billing page',
        themes: ['billing', 'ux'],
        strength: 2,
      },
    ]

    const mockSynthesisRecord = {
      id: 'test-uuid',
      createdAt: new Date('2026-03-24T09:00:00Z'),
      periodStart: new Date('2026-03-17T09:00:00Z'),
      periodEnd: new Date('2026-03-24T09:00:00Z'),
      inputCount: 10,
      signalCount: 3,
      digestMarkdown: null,
      trigger: 'cron',
    }

    beforeEach(() => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'completed',
        synthesisId: 'test-uuid',
        signalCount: 3,
        inputCount: 10,
      })

      // First db.select().from().where() call returns signal rows
      // Second db.select().from().where() call returns synthesis record
      mockDbSelectWhere
        .mockResolvedValueOnce(mockSignalRows)
        .mockResolvedValueOnce([mockSynthesisRecord])

      mockRenderDigest.mockReturnValueOnce('# Digest Markdown')
      mockDigestToHtml.mockReturnValueOnce('<h1>Digest HTML</h1>')
      mockDbUpdateWhere.mockResolvedValueOnce(undefined)
      mockSendDigestEmail.mockResolvedValueOnce({
        sent: true,
        recipients: ['a@b.com'],
        blobUrl: 'https://blob.url/digest.md',
      })
    })

    it('returns completed response with correct fields', async () => {
      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        status: 'completed',
        synthesisId: 'test-uuid',
        inputCount: 10,
        signalCount: 3,
        digestSent: true,
        recipients: ['a@b.com'],
        blobUrl: 'https://blob.url/digest.md',
      })
    })

    it('calls renderDigest with mapped signal data', async () => {
      await GET(makeRequest('Bearer test-secret'))

      expect(mockRenderDigest).toHaveBeenCalledOnce()
      const [signals, periodStart, periodEnd, inputCount] = mockRenderDigest.mock.calls[0]

      expect(signals).toHaveLength(3)
      expect(signals[0]).toEqual({
        statement: 'Users want dark mode',
        reasoning: 'Multiple users requested it',
        evidence: ['input-1', 'input-2'],
        suggested_action: 'Add dark mode toggle',
        themes: ['ui', 'accessibility'],
        strength: 2,
      })

      expect(periodStart).toEqual(new Date('2026-03-17T09:00:00Z'))
      expect(periodEnd).toEqual(new Date('2026-03-24T09:00:00Z'))
      expect(inputCount).toBe(10)
    })

    it('calls digestToHtml with rendered markdown', async () => {
      await GET(makeRequest('Bearer test-secret'))

      expect(mockDigestToHtml).toHaveBeenCalledOnce()
      expect(mockDigestToHtml).toHaveBeenCalledWith('# Digest Markdown')
    })

    it('stores digest markdown in synthesis record', async () => {
      await GET(makeRequest('Bearer test-secret'))

      expect(mockDbUpdateSet).toHaveBeenCalledOnce()
      expect(mockDbUpdateSet).toHaveBeenCalledWith({ digestMarkdown: '# Digest Markdown' })
    })

    it('calls sendDigestEmail with markdown and html', async () => {
      await GET(makeRequest('Bearer test-secret'))

      expect(mockSendDigestEmail).toHaveBeenCalledOnce()
      const [options] = mockSendDigestEmail.mock.calls[0]
      expect(options.markdown).toBe('# Digest Markdown')
      expect(options.html).toBe('<h1>Digest HTML</h1>')
      expect(options.signalCount).toBe(3)
      expect(options.periodStart).toEqual(new Date('2026-03-17T09:00:00Z'))
      expect(options.periodEnd).toEqual(new Date('2026-03-24T09:00:00Z'))
    })
  })

  // -------------------------------------------------------------------------
  // Email failure graceful degradation
  // -------------------------------------------------------------------------

  describe('email failure', () => {
    beforeEach(() => {
      mockRunSynthesis.mockResolvedValueOnce({
        status: 'completed',
        synthesisId: 'test-uuid',
        signalCount: 2,
        inputCount: 5,
      })

      mockDbSelectWhere
        .mockResolvedValueOnce([{
          id: 'signal-1',
          synthesisId: 'test-uuid',
          statement: 'Test signal',
          reasoning: 'Test reason',
          evidence: ['input-1'],
          suggestedAction: 'Test action',
          themes: ['test'],
          strength: 1,
        }])
        .mockResolvedValueOnce([{
          id: 'test-uuid',
          createdAt: new Date(),
          periodStart: new Date('2026-03-17T09:00:00Z'),
          periodEnd: new Date('2026-03-24T09:00:00Z'),
          inputCount: 5,
          signalCount: 2,
          digestMarkdown: null,
          trigger: 'cron',
        }])

      mockRenderDigest.mockReturnValueOnce('# Digest')
      mockDigestToHtml.mockReturnValueOnce('<h1>Digest</h1>')
      mockDbUpdateWhere.mockResolvedValueOnce(undefined)

      mockSendDigestEmail.mockResolvedValueOnce({
        sent: false,
        recipients: [],
        blobUrl: '',
      })
    })

    it('returns 200 with digestSent false when email fails', async () => {
      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.status).toBe('completed')
      expect(body.digestSent).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // LLM error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns 200 with error status when runSynthesis throws', async () => {
      mockRunSynthesis.mockRejectedValueOnce(new Error('LLM rate limit exceeded'))

      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        status: 'error',
        error: 'LLM rate limit exceeded',
      })
    })

    it('handles non-Error throws gracefully', async () => {
      mockRunSynthesis.mockRejectedValueOnce('string error')

      const response = await GET(makeRequest('Bearer test-secret'))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        status: 'error',
        error: 'Unknown error',
      })
    })
  })
})
