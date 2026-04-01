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

    // --- Linear as intake source ---
    if (isLinearIntakeEnabled() && event.action === 'create') {
      let result: string | null = null

      switch (event.type) {
        case 'Issue':
          result = await ingestLinearContent({
            content: formatIssue(event.data),
            source: 'linear',
            contributor: (event.data.creatorId as string) ?? 'linear',
            notes: event.data.url as string | undefined,
          })
          break

        case 'Comment':
          result = await ingestLinearContent({
            content: formatComment(event.data),
            source: 'linear',
            contributor: (event.data.userId as string) ?? 'linear',
            notes: (event.data.url as string) ?? undefined,
          })
          break

        case 'CustomerNeed':
          result = await ingestLinearContent({
            content: formatCustomerRequest(event.data),
            source: 'linear-customer-request',
            contributor: (event.data.customerName as string) ?? 'customer',
            notes: event.data.url as string | undefined,
            isFeedback: true,
          })
          break

        case 'ProjectUpdate':
          result = await ingestLinearContent({
            content: formatProjectUpdate(event.data),
            source: 'linear-project-update',
            contributor: (event.data.userId as string) ?? 'linear',
            notes: event.data.url as string | undefined,
          })
          break

        case 'InitiativeUpdate':
          result = await ingestLinearContent({
            content: formatInitiativeUpdate(event.data),
            source: 'linear-initiative',
            contributor: (event.data.userId as string) ?? 'linear',
            notes: event.data.url as string | undefined,
          })
          break

        case 'Document':
          result = await ingestLinearContent({
            content: formatDocument(event.data),
            source: 'linear-document',
            contributor: (event.data.creatorId as string) ?? 'linear',
            notes: event.data.url as string | undefined,
          })
          break
      }

      if (result) {
        return NextResponse.json({
          handled: true,
          action: `intake_${event.type.toLowerCase()}`,
          inputId: result,
        })
      }
    }

    return NextResponse.json({ handled: false, reason: 'no_matching_handler' })
  } catch (error) {
    console.error('Linear webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --- Content formatters ---

function formatIssue(data: Record<string, unknown>): string {
  const identifier = data.identifier as string
  const title = data.title as string
  const description = (data.description as string) || ''
  if (!title) return ''
  return `[${identifier}] ${title}${description ? `\n\n${description}` : ''}`
}

function formatComment(data: Record<string, unknown>): string {
  const body = data.body as string
  const issue = data.issue as Record<string, unknown> | undefined
  const identifier = issue?.identifier as string | undefined
  if (!body?.trim()) return ''
  const prefix = identifier ? `[${identifier}] Comment` : 'Linear comment'
  return `${prefix}:\n\n${body}`
}

function formatCustomerRequest(data: Record<string, unknown>): string {
  const title = (data.title as string) || ''
  const body = (data.body as string) || ''
  const customerName = (data.customerName as string) || 'Unknown customer'
  const priority = data.priority as number | undefined
  if (!title && !body) return ''
  const parts = [`Customer request from ${customerName}`]
  if (priority) parts[0] += ` (priority: ${priority})`
  if (title) parts.push(title)
  if (body) parts.push(body)
  return parts.join('\n\n')
}

function formatProjectUpdate(data: Record<string, unknown>): string {
  const body = (data.body as string) || ''
  const project = data.project as Record<string, unknown> | undefined
  const projectName = (project?.name as string) || 'Unknown project'
  const health = data.health as string | undefined
  if (!body) return ''
  const header = health
    ? `Project update: ${projectName} (health: ${health})`
    : `Project update: ${projectName}`
  return `${header}\n\n${body}`
}

function formatInitiativeUpdate(data: Record<string, unknown>): string {
  const body = (data.body as string) || ''
  const initiative = data.initiative as Record<string, unknown> | undefined
  const name = (initiative?.name as string) || 'Unknown initiative'
  if (!body) return ''
  return `Initiative update: ${name}\n\n${body}`
}

function formatDocument(data: Record<string, unknown>): string {
  const title = (data.title as string) || ''
  const content = (data.content as string) || ''
  if (!title && !content) return ''
  const parts: string[] = []
  if (title) parts.push(`Linear document: ${title}`)
  if (content) parts.push(content)
  return parts.join('\n\n')
}

// --- Shared ingest logic ---

interface IngestParams {
  content: string
  source: string
  contributor: string
  notes?: string
  isFeedback?: boolean
}

async function ingestLinearContent(params: IngestParams): Promise<string | null> {
  if (!params.content) return null

  const contentHash = crypto.createHash('sha256').update(params.content).digest('hex')

  const existing = await db.query.inputs.findFirst({
    where: eq(inputs.contentHash, contentHash),
  })
  if (existing) return null

  const [inserted] = await db
    .insert(inputs)
    .values({
      rawContent: params.content,
      source: params.source,
      contributor: params.contributor,
      contentHash,
      status: 'unprocessed',
      isFeedback: params.isFeedback ?? false,
      notes: params.notes ? `Linear: ${params.notes}` : undefined,
    })
    .returning()

  const provider = getLLMProvider()
  structureInput(params.content, params.source, params.contributor, provider)
    .then(async (structured) => {
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
    })
    .catch((error) => {
      console.error(`Structuring failed for ${params.source} input`, inserted.id, error)
    })

  return inserted.id
}
