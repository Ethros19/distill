import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreate = vi.fn()

class MockRateLimitError extends Error {
  status = 429
  constructor(message = 'Rate limited') {
    super(message)
    this.name = 'RateLimitError'
  }
}

vi.mock('openai', () => {
  class OpenAI {
    static RateLimitError = MockRateLimitError
    chat = {
      completions: {
        create: mockCreate,
      },
    }
  }

  return { default: OpenAI }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OpenAIProvider', () => {
  let OpenAIProvider: typeof import('@/lib/providers/openai').OpenAIProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import to pick up mocks
    const mod = await import('@/lib/providers/openai')
    OpenAIProvider = mod.OpenAIProvider
  })

  // -------------------------------------------------------------------------
  // structure()
  // -------------------------------------------------------------------------

  describe('structure()', () => {
    const validStructuredResponse = {
      summary: 'User wants dark mode support in the dashboard',
      type: 'feature_request',
      themes: ['ui', 'accessibility'],
      urgency: 3,
      confidence: 0.9,
    }

    it('returns valid StructuredInput from OpenAI response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validStructuredResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      const result = await provider.structure({
        content: 'I really need dark mode',
        source: 'email',
        contributor: 'user@example.com',
      })

      expect(result).toEqual(validStructuredResponse)
    })

    it('uses structured outputs response_format with json_schema', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validStructuredResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.structure({
        content: 'Test feedback',
        source: 'paste',
        contributor: 'tester',
      })

      expect(mockCreate).toHaveBeenCalledOnce()
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.response_format.type).toBe('json_schema')
      expect(callArgs.response_format.json_schema.name).toBe('StructuredInput')
      expect(callArgs.response_format.json_schema.strict).toBe(true)
    })

    it('formats user message with source, contributor, and content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validStructuredResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.structure({
        content: 'My feedback text',
        source: 'slack',
        contributor: 'alice@co.com',
      })

      const callArgs = mockCreate.mock.calls[0][0]
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('Source: slack')
      expect(userMessage.content).toContain('Contributor: alice@co.com')
      expect(userMessage.content).toContain('My feedback text')
    })

    it('throws LLMError when response has no content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      })

      const provider = new OpenAIProvider('test-key')
      await expect(provider.structure({
        content: 'test',
        source: 'email',
        contributor: 'user',
      })).rejects.toThrow('No content in OpenAI response')
    })

    it('throws LLMRateLimitError on 429 response', async () => {
      mockCreate.mockRejectedValueOnce(new MockRateLimitError('Rate limited'))

      const provider = new OpenAIProvider('test-key')
      await expect(provider.structure({
        content: 'test',
        source: 'email',
        contributor: 'user',
      })).rejects.toThrow('Rate limited by openai')
    })

    it('throws LLMError on generic API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API connection failed'))

      const provider = new OpenAIProvider('test-key')
      await expect(provider.structure({
        content: 'test',
        source: 'email',
        contributor: 'user',
      })).rejects.toThrow('API connection failed')
    })
  })

  // -------------------------------------------------------------------------
  // synthesize()
  // -------------------------------------------------------------------------

  describe('synthesize()', () => {
    const validSynthesisResponse = {
      signals: [
        {
          statement: 'UI improvements are a top priority',
          reasoning: 'Multiple users mentioned UI-related feedback',
          evidence: ['input-1', 'input-3'],
          suggested_action: 'Prioritize dark mode and dashboard enhancements',
          themes: ['ui', 'accessibility'],
          strength: 2,
        },
      ],
    }

    const sampleInputs = [
      {
        id: 'input-1',
        summary: 'Users want dark mode',
        type: 'feature_request',
        themes: ['ui', 'accessibility'],
        urgency: 3,
        source: 'email',
      },
      {
        id: 'input-3',
        summary: 'Love the new dashboard',
        type: 'praise',
        themes: ['ui', 'dashboard'],
        urgency: 1,
        source: 'email',
      },
    ]

    it('returns valid LLMSignal array from OpenAI response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validSynthesisResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      const result = await provider.synthesize(sampleInputs)

      expect(result).toEqual(validSynthesisResponse.signals)
      expect(result).toHaveLength(1)
      expect(result[0].statement).toBe('UI improvements are a top priority')
    })

    it('uses structured outputs response_format for synthesis', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validSynthesisResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.synthesize(sampleInputs)

      expect(mockCreate).toHaveBeenCalledOnce()
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.response_format.type).toBe('json_schema')
      expect(callArgs.response_format.json_schema.name).toBe('SynthesisResult')
      expect(callArgs.response_format.json_schema.strict).toBe(true)
    })

    it('formats input context with IDs, metadata, and themes', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validSynthesisResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.synthesize(sampleInputs)

      const callArgs = mockCreate.mock.calls[0][0]
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('[input-1]')
      expect(userMessage.content).toContain('[input-3]')
      expect(userMessage.content).toContain('Analyze these 2 feedback inputs')
    })

    it('throws LLMRateLimitError on 429 during synthesis', async () => {
      mockCreate.mockRejectedValueOnce(new MockRateLimitError('Rate limited'))

      const provider = new OpenAIProvider('test-key')
      await expect(provider.synthesize(sampleInputs)).rejects.toThrow('Rate limited by openai')
    })

    it('throws LLMError when synthesis response has no content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      })

      const provider = new OpenAIProvider('test-key')
      await expect(provider.synthesize(sampleInputs)).rejects.toThrow('No content in OpenAI response')
    })
  })

  // -------------------------------------------------------------------------
  // Default models
  // -------------------------------------------------------------------------

  describe('default models', () => {
    it('uses gpt-4o-mini for structure by default', async () => {
      const validResponse = {
        summary: 'test',
        type: 'observation',
        themes: ['test'],
        urgency: 1,
        confidence: 0.5,
      }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.structure({ content: 'test', source: 'paste', contributor: 'user' })

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('gpt-4o-mini')
    })

    it('uses gpt-4o for synthesize by default', async () => {
      const validResponse = { signals: [] }
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validResponse) } }],
      })

      const provider = new OpenAIProvider('test-key')
      await provider.synthesize([])

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('gpt-4o')
    })
  })
})
