import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals, inputs } from '@/lib/schema'
import {
  verifyLinearWebhook,
  mapLinearStateToSignalStatus,
  isLinearIntakeEnabled,
} from '@/lib/linear'
import { structureInput } from '@/lib/structurer'
import { getLLMProvider } from '@/lib/llm/provider-factory'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('linear-signature') ?? ''

    if (!signature || !verifyLinearWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let event: {
      action: string
      type: string
      data: Record<string, unknown>
      updatedFrom?: Record<string, unknown>
    }

    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // --- Two-way sync: Issue status changes → update linked signal ---
    if (event.type === 'Issue' && event.action === 'update' && event.updatedFrom) {
      const stateChanged = 'stateId' in (event.updatedFrom ?? {})

      if (stateChanged) {
        const issueId = event.data.id as string
        const state = event.data.state as { type?: string } | undefined
        const stateType = state?.type

        if (issueId && stateType) {
          const newStatus = mapLinearStateToSignalStatus(stateType)

          if (newStatus) {
            const [signal] = await db
              .select({ id: signals.id, status: signals.status })
              .from(signals)
              .where(eq(signals.linearIssueId, issueId))

            if (signal && signal.status !== newStatus) {
              await db
                .update(signals)
                .set({ status: newStatus })
                .where(eq(signals.id, signal.id))

              return NextResponse.json({
                handled: true,
                action: 'status_sync',
                signalId: signal.id,
                newStatus,
              })
            }
          }
        }
      }
    }

    // --- Linear as intake source: new issues and comments → inputs ---
    if (isLinearIntakeEnabled()) {
      // New issue created
      if (event.type === 'Issue' && event.action === 'create') {
        const result = await ingestLinearIssue(event.data)
        if (result) {
          return NextResponse.json({ handled: true, action: 'intake_issue', inputId: result })
        }
      }

      // New comment on an issue
      if (event.type === 'Comment' && event.action === 'create') {
        const result = await ingestLinearComment(event.data)
        if (result) {
          return NextResponse.json({ handled: true, action: 'intake_comment', inputId: result })
        }
      }
    }

    return NextResponse.json({ handled: false, reason: 'no_matching_handler' })
  } catch (error) {
    console.error('Linear webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function ingestLinearIssue(data: Record<string, unknown>): Promise<string | null> {
  const title = data.title as string
  const description = (data.description as string) || ''
  const identifier = data.identifier as string
  const creatorName = (data.creatorId as string) ?? 'linear'
  const url = data.url as string

  if (!title) return null

  const content = `[${identifier}] ${title}${description ? `\n\n${description}` : ''}`
  const contentHash = crypto.createHash('sha256').update(content).digest('hex')

  // Dedup
  const existing = await db.query.inputs.findFirst({
    where: eq(inputs.contentHash, contentHash),
  })
  if (existing) return null

  const [inserted] = await db
    .insert(inputs)
    .values({
      rawContent: content,
      source: 'linear',
      contributor: creatorName,
      contentHash,
      status: 'unprocessed',
      isFeedback: false,
      notes: url ? `Linear: ${url}` : undefined,
    })
    .returning()

  // Async structuring
  const provider = getLLMProvider()
  structureInput(content, 'linear', creatorName, provider).then(async (structured) => {
    await db
      .update(inputs)
      .set({
        summary: structured.summary,
        type: structured.type,
        themes: structured.themes,
        urgency: structured.urgency,
        confidence: structured.confidence,
        isFeedback: structured.is_feedback,
        stream: structured.stream ?? null,
        status: 'processed',
      })
      .where(eq(inputs.id, inserted.id))
  }).catch((error) => {
    console.error('Structuring failed for Linear issue input', inserted.id, error)
  })

  return inserted.id
}

async function ingestLinearComment(data: Record<string, unknown>): Promise<string | null> {
  const body = data.body as string
  const issueId = (data.issue as Record<string, unknown>)?.id as string | undefined
  const issueIdentifier = (data.issue as Record<string, unknown>)?.identifier as string | undefined
  const userId = (data.userId as string) ?? 'linear'
  const url = data.url as string

  if (!body || !body.trim()) return null

  const prefix = issueIdentifier ? `[${issueIdentifier}] Comment` : 'Linear comment'
  const content = `${prefix}:\n\n${body}`
  const contentHash = crypto.createHash('sha256').update(content).digest('hex')

  // Dedup
  const existing = await db.query.inputs.findFirst({
    where: eq(inputs.contentHash, contentHash),
  })
  if (existing) return null

  const [inserted] = await db
    .insert(inputs)
    .values({
      rawContent: content,
      source: 'linear',
      contributor: userId,
      contentHash,
      status: 'unprocessed',
      isFeedback: false,
      notes: url ? `Linear: ${url}` : issueId ? `Linear issue: ${issueId}` : undefined,
    })
    .returning()

  // Async structuring
  const provider = getLLMProvider()
  structureInput(content, 'linear', userId, provider).then(async (structured) => {
    await db
      .update(inputs)
      .set({
        summary: structured.summary,
        type: structured.type,
        themes: structured.themes,
        urgency: structured.urgency,
        confidence: structured.confidence,
        isFeedback: structured.is_feedback,
        stream: structured.stream ?? null,
        status: 'processed',
      })
      .where(eq(inputs.id, inserted.id))
  }).catch((error) => {
    console.error('Structuring failed for Linear comment input', inserted.id, error)
  })

  return inserted.id
}
