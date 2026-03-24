import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these are available before vi.mock hoisting
// ---------------------------------------------------------------------------

const { mockEmailsSend, mockPut } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
  mockPut: vi.fn(),
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
// Import after mocks
// ---------------------------------------------------------------------------

import { parseRecipients, uploadDigestBlob, sendDigestEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// parseRecipients
// ---------------------------------------------------------------------------

describe('parseRecipients', () => {
  const originalEnv = process.env.DIGEST_RECIPIENTS

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DIGEST_RECIPIENTS
    } else {
      process.env.DIGEST_RECIPIENTS = originalEnv
    }
  })

  it('parses comma-separated emails', () => {
    process.env.DIGEST_RECIPIENTS = 'a@b.com,c@d.com'
    expect(parseRecipients()).toEqual(['a@b.com', 'c@d.com'])
  })

  it('trims whitespace', () => {
    process.env.DIGEST_RECIPIENTS = ' a@b.com , c@d.com '
    expect(parseRecipients()).toEqual(['a@b.com', 'c@d.com'])
  })

  it('returns empty array when unset', () => {
    delete process.env.DIGEST_RECIPIENTS
    expect(parseRecipients()).toEqual([])
  })

  it('filters empty strings from trailing commas', () => {
    process.env.DIGEST_RECIPIENTS = 'a@b.com,,c@d.com,'
    expect(parseRecipients()).toEqual(['a@b.com', 'c@d.com'])
  })
})

// ---------------------------------------------------------------------------
// uploadDigestBlob
// ---------------------------------------------------------------------------

describe('uploadDigestBlob', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken
    }
  })

  it('skips upload when BLOB_READ_WRITE_TOKEN is not set', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const url = await uploadDigestBlob('# test', new Date('2026-03-24T09:00:00Z'))
    expect(url).toBe('')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('uploads with correct key format when token is set', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
    mockPut.mockResolvedValueOnce({ url: 'https://blob.vercel.com/digests/2026-03-24-synthesis.md' })

    const url = await uploadDigestBlob('# digest content', new Date('2026-03-24T09:00:00Z'))

    expect(url).toBe('https://blob.vercel.com/digests/2026-03-24-synthesis.md')
    expect(mockPut).toHaveBeenCalledWith(
      'digests/2026-03-24-synthesis.md',
      '# digest content',
      { access: 'public', contentType: 'text/markdown' },
    )
  })
})

// ---------------------------------------------------------------------------
// sendDigestEmail
// ---------------------------------------------------------------------------

describe('sendDigestEmail', () => {
  const baseOptions = {
    markdown: '# Digest',
    html: '<h1>Digest</h1>',
    periodStart: new Date('2026-03-17T09:00:00Z'),
    periodEnd: new Date('2026-03-24T09:00:00Z'),
    signalCount: 3,
  }

  const originalRecipients = process.env.DIGEST_RECIPIENTS
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN
  const originalApiKey = process.env.RESEND_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalRecipients === undefined) {
      delete process.env.DIGEST_RECIPIENTS
    } else {
      process.env.DIGEST_RECIPIENTS = originalRecipients
    }
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken
    }
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY
    } else {
      process.env.RESEND_API_KEY = originalApiKey
    }
  })

  it('skips send when no recipients', async () => {
    delete process.env.DIGEST_RECIPIENTS

    const result = await sendDigestEmail(baseOptions)

    expect(result).toEqual({ sent: false, recipients: [], blobUrl: '' })
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('sends email with correct params when recipients exist', async () => {
    process.env.DIGEST_RECIPIENTS = 'alice@example.com,bob@example.com'
    process.env.RESEND_API_KEY = 'test-api-key'
    delete process.env.BLOB_READ_WRITE_TOKEN

    mockEmailsSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null })

    const result = await sendDigestEmail(baseOptions)

    expect(result.sent).toBe(true)
    expect(result.recipients).toEqual(['alice@example.com', 'bob@example.com'])

    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const sendArgs = mockEmailsSend.mock.calls[0][0]
    expect(sendArgs.from).toBe('Distill <signals@signals.withpiper.ai>')
    expect(sendArgs.to).toEqual(['alice@example.com', 'bob@example.com'])
    expect(sendArgs.subject).toContain('3 signals')
    expect(sendArgs.subject).toContain('Mar 17')
    expect(sendArgs.subject).toContain('Mar 24')
    expect(sendArgs.html).toBe('<h1>Digest</h1>')
  })

  it('returns sent: false on Resend API error without throwing', async () => {
    process.env.DIGEST_RECIPIENTS = 'alice@example.com'
    process.env.RESEND_API_KEY = 'test-api-key'
    delete process.env.BLOB_READ_WRITE_TOKEN

    mockEmailsSend.mockRejectedValueOnce(new Error('Resend API error'))

    const result = await sendDigestEmail(baseOptions)

    expect(result.sent).toBe(false)
    expect(result.recipients).toEqual(['alice@example.com'])
  })
})
