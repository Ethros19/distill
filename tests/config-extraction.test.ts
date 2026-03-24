import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these are available before vi.mock hoisting
// ---------------------------------------------------------------------------

const { mockMessagesCreate, mockEmailsSend, mockPut } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
  mockEmailsSend: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockMessagesCreate }
    static RateLimitError = class extends Error {}
  },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockEmailsSend }
  },
}))

vi.mock('@vercel/blob', () => ({
  put: mockPut,
}))

// ---------------------------------------------------------------------------
// Anthropic Provider — model env var tests
// ---------------------------------------------------------------------------

describe('Anthropic provider model configuration', () => {
  const originalStructureModel = process.env.ANTHROPIC_STRUCTURE_MODEL
  const originalSynthesizeModel = process.env.ANTHROPIC_SYNTHESIZE_MODEL

  beforeEach(() => {
    vi.clearAllMocks()
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"summary":"test","type":"observation","themes":["test"],"urgency":1,"confidence":0.9}' }],
    })
  })

  afterEach(() => {
    if (originalStructureModel === undefined) {
      delete process.env.ANTHROPIC_STRUCTURE_MODEL
    } else {
      process.env.ANTHROPIC_STRUCTURE_MODEL = originalStructureModel
    }
    if (originalSynthesizeModel === undefined) {
      delete process.env.ANTHROPIC_SYNTHESIZE_MODEL
    } else {
      process.env.ANTHROPIC_SYNTHESIZE_MODEL = originalSynthesizeModel
    }
    vi.resetModules()
  })

  it('uses default structure model when ANTHROPIC_STRUCTURE_MODEL is not set', async () => {
    delete process.env.ANTHROPIC_STRUCTURE_MODEL

    const { AnthropicProvider } = await import('@/lib/providers/anthropic')
    const provider = new AnthropicProvider('test-key')

    await provider.structure({ content: 'test feedback', source: 'email', contributor: 'user@test.com' })

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
    )
  })

  it('uses custom structure model from ANTHROPIC_STRUCTURE_MODEL env var', async () => {
    process.env.ANTHROPIC_STRUCTURE_MODEL = 'claude-haiku-custom'

    const { AnthropicProvider } = await import('@/lib/providers/anthropic')
    const provider = new AnthropicProvider('test-key')

    await provider.structure({ content: 'test feedback', source: 'email', contributor: 'user@test.com' })

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-custom' }),
    )
  })

  it('uses default synthesize model when ANTHROPIC_SYNTHESIZE_MODEL is not set', async () => {
    delete process.env.ANTHROPIC_SYNTHESIZE_MODEL
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"signals":[]}' }],
    })

    const { AnthropicProvider } = await import('@/lib/providers/anthropic')
    const provider = new AnthropicProvider('test-key')

    await provider.synthesize([
      { id: '1', summary: 'test', type: 'observation', themes: ['test'], urgency: 1, source: 'email' },
      { id: '2', summary: 'test2', type: 'bug_report', themes: ['bug'], urgency: 3, source: 'paste' },
    ])

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' }),
    )
  })

  it('uses custom synthesize model from ANTHROPIC_SYNTHESIZE_MODEL env var', async () => {
    process.env.ANTHROPIC_SYNTHESIZE_MODEL = 'claude-sonnet-custom'
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"signals":[]}' }],
    })

    const { AnthropicProvider } = await import('@/lib/providers/anthropic')
    const provider = new AnthropicProvider('test-key')

    await provider.synthesize([
      { id: '1', summary: 'test', type: 'observation', themes: ['test'], urgency: 1, source: 'email' },
      { id: '2', summary: 'test2', type: 'bug_report', themes: ['bug'], urgency: 3, source: 'paste' },
    ])

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-custom' }),
    )
  })
})

// ---------------------------------------------------------------------------
// Email — from address env var tests
// ---------------------------------------------------------------------------

describe('Email from address configuration', () => {
  const originalFromAddress = process.env.RESEND_FROM_ADDRESS
  const originalRecipients = process.env.DIGEST_RECIPIENTS
  const originalApiKey = process.env.RESEND_API_KEY
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN

  const baseOptions = {
    markdown: '# Digest',
    html: '<h1>Digest</h1>',
    periodStart: new Date('2026-03-17T09:00:00Z'),
    periodEnd: new Date('2026-03-24T09:00:00Z'),
    signalCount: 3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DIGEST_RECIPIENTS = 'test@example.com'
    process.env.RESEND_API_KEY = 'test-key'
    delete process.env.BLOB_READ_WRITE_TOKEN
    mockEmailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  afterEach(() => {
    if (originalFromAddress === undefined) {
      delete process.env.RESEND_FROM_ADDRESS
    } else {
      process.env.RESEND_FROM_ADDRESS = originalFromAddress
    }
    if (originalRecipients === undefined) {
      delete process.env.DIGEST_RECIPIENTS
    } else {
      process.env.DIGEST_RECIPIENTS = originalRecipients
    }
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY
    } else {
      process.env.RESEND_API_KEY = originalApiKey
    }
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken
    }
    vi.resetModules()
  })

  it('uses default from address when RESEND_FROM_ADDRESS is not set', async () => {
    delete process.env.RESEND_FROM_ADDRESS

    const { sendDigestEmail } = await import('@/lib/email')
    await sendDigestEmail(baseOptions)

    const sendArgs = mockEmailsSend.mock.calls[0][0]
    expect(sendArgs.from).toBe('Distill <distill@example.com>')
  })

  it('uses custom from address from RESEND_FROM_ADDRESS env var', async () => {
    process.env.RESEND_FROM_ADDRESS = 'MyApp <noreply@myapp.com>'

    const { sendDigestEmail } = await import('@/lib/email')
    await sendDigestEmail(baseOptions)

    const sendArgs = mockEmailsSend.mock.calls[0][0]
    expect(sendArgs.from).toBe('MyApp <noreply@myapp.com>')
  })
})
