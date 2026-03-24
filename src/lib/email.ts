import { Resend } from 'resend'
import { put } from '@vercel/blob'

/**
 * Parse DIGEST_RECIPIENTS env var into an array of email addresses.
 */
export function parseRecipients(): string[] {
  const raw = process.env.DIGEST_RECIPIENTS
  if (!raw) return []
  return raw.split(',').map((e) => e.trim()).filter(Boolean)
}

/**
 * Upload digest Markdown to Vercel Blob for audit trail.
 * Returns the blob URL, or empty string if BLOB_READ_WRITE_TOKEN is not set.
 */
export async function uploadDigestBlob(
  markdown: string,
  periodEnd: Date,
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return ''
  }

  const dateStr = periodEnd.toISOString().slice(0, 10)
  const key = `digests/${dateStr}-synthesis.md`

  const blob = await put(key, markdown, {
    access: 'public',
    contentType: 'text/markdown',
  })

  return blob.url
}

/**
 * Format a date range for the email subject (e.g. "Mar 17 - Mar 24").
 */
function formatSubjectDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

export interface SendDigestOptions {
  markdown: string
  html: string
  periodStart: Date
  periodEnd: Date
  signalCount: number
}

export interface SendDigestResult {
  sent: boolean
  recipients: string[]
  blobUrl: string
}

/**
 * Orchestrate digest email delivery: upload blob, send via Resend.
 * Never throws on email failure — returns sent: false instead.
 */
export async function sendDigestEmail(
  options: SendDigestOptions,
): Promise<SendDigestResult> {
  const recipients = parseRecipients()

  if (recipients.length === 0) {
    return { sent: false, recipients: [], blobUrl: '' }
  }

  const blobUrl = await uploadDigestBlob(options.markdown, options.periodEnd)

  const dateRange = formatSubjectDateRange(options.periodStart, options.periodEnd)
  const subject = `Distill Weekly Digest — ${options.signalCount} signals (${dateRange})`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)

    await resend.emails.send({
      from: 'Distill <signals@signals.example.com>',
      to: recipients,
      subject,
      html: options.html,
    })

    return { sent: true, recipients, blobUrl }
  } catch (error) {
    console.error('Failed to send digest email:', error)
    return { sent: false, recipients, blobUrl }
  }
}
