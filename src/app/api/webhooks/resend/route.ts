import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { structureInput } from '@/lib/structurer'
import { AnthropicProvider } from '@/lib/providers/anthropic'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Use request.text() not request.json() — signature is over raw bytes
    const rawBody = await request.text()

    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
    }

    // Replay attack prevention: reject webhooks older than 5 minutes
    const timestampSeconds = parseInt(svixTimestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampSeconds) > 300) {
      return NextResponse.json({ error: 'Webhook too old' }, { status: 401 })
    }

    // Verify signature using Resend SDK (throws on invalid signature)
    try {
      resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
      })
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }

    // Parse the verified payload
    let event: Record<string, unknown>
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Only process email.received events — acknowledge others with 200
    if (event.type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' })
    }

    const email = event.email as {
      from: string
      subject?: string
      message_id?: string
    } | undefined

    if (!email) {
      return NextResponse.json({ status: 'ignored' })
    }

    // Fetch full email body from Resend Received Emails API
    // (webhook payload only contains metadata, not the body)
    const emailId = email.message_id || (event.id as string)
    let emailBody = ''

    try {
      const fullEmail = await resend.emails.receiving.get(emailId)
      emailBody = (fullEmail.data as Record<string, unknown> | null)?.text as string
        || (fullEmail.data as Record<string, unknown> | null)?.html as string
        || ''
    } catch (error) {
      console.error('Failed to fetch email body from Resend API:', error)
      // Continue with subject-only content — cron can retry structuring later
    }

    // Combine subject + body as content
    const content = [email.subject, emailBody].filter(Boolean).join('\n\n')

    if (!content) {
      // No subject and no body — nothing to process, but acknowledge the webhook
      console.warn('Webhook received with no subject or body, emailId:', emailId)
      return NextResponse.json({ status: 'skipped', reason: 'empty content' })
    }

    // Compute SHA256 hash for dedup
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    // Check for duplicate content
    const existing = await db.query.inputs.findFirst({
      where: eq(inputs.contentHash, contentHash),
    })

    if (existing) {
      // Return 200 (not 409) — Resend expects 200 to stop retrying
      return NextResponse.json({ status: 'duplicate', existingId: existing.id })
    }

    // Insert new input record
    const result = await db.insert(inputs).values({
      rawContent: content,
      source: 'email',
      contributor: email.from,
      contentHash,
      status: 'unprocessed',
    }).returning()

    const inputId = result[0].id

    // Fire async structuring — does NOT block webhook response
    const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY!)
    structureInput(content, 'email', email.from, provider)
      .then(async (structured) => {
        await db.update(inputs).set({
          summary: structured.summary,
          type: structured.type,
          themes: structured.themes,
          urgency: structured.urgency,
          confidence: structured.confidence,
          status: 'processed',
        }).where(eq(inputs.id, inputId))
      })
      .catch((error) => {
        // Log but don't affect webhook response — cron catches stragglers
        console.error('Structuring failed for input', inputId, error)
      })

    return NextResponse.json({ id: inputId, status: 'unprocessed' })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
