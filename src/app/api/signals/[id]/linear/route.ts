import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals } from '@/lib/schema'
import { isLinearConfigured, createLinearIssue } from '@/lib/linear'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    if (!isLinearConfigured()) {
      return NextResponse.json(
        { error: 'Linear integration is not configured' },
        { status: 501 },
      )
    }

    const [signal] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, id))

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    if (signal.linearIssueUrl) {
      return NextResponse.json(
        {
          error: 'Signal already pushed to Linear',
          issueUrl: signal.linearIssueUrl,
        },
        { status: 409 },
      )
    }

    // Build description from signal data
    const descriptionParts: string[] = []

    if (signal.reasoning) {
      descriptionParts.push(`## Why this matters\n\n${signal.reasoning}`)
    }

    if (signal.suggestedAction) {
      descriptionParts.push(`## Suggested action\n\n${signal.suggestedAction}`)
    }

    if (signal.themes && signal.themes.length > 0) {
      descriptionParts.push(`## Themes\n\n${signal.themes.join(', ')}`)
    }

    const evidenceCount = signal.evidence?.length ?? 0
    if (evidenceCount > 0) {
      descriptionParts.push(
        `## Evidence\n\n${evidenceCount} supporting input${evidenceCount !== 1 ? 's' : ''} from user feedback`,
      )
    }

    descriptionParts.push(`---\n*Created from [Distill](${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/signals/${signal.id}) signal (strength: ${signal.strength})*`)

    const description = descriptionParts.join('\n\n')

    const result = await createLinearIssue({
      title: signal.statement,
      description,
    })

    if (!result.success) {
      console.error('Linear push failed:', result.error)
      return NextResponse.json(
        { error: result.error ?? 'Failed to create Linear issue' },
        { status: 502 },
      )
    }

    // Update signal with Linear issue ID/URL and auto-transition to in_progress
    const [updated] = await db
      .update(signals)
      .set({
        linearIssueId: result.issueId,
        linearIssueUrl: result.issueUrl,
        status: 'in_progress',
      })
      .where(eq(signals.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      issueUrl: result.issueUrl,
      identifier: result.identifier,
      signal: updated,
    })
  } catch (error) {
    console.error('Push to Linear error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
