import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { signals, inputs, SIGNAL_STATUSES } from '@/lib/schema'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    const [signal] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, id))

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    // Resolve evidence: parse jsonb string array and fetch full input records
    const evidenceIds = (signal.evidence ?? []) as string[]
    let evidenceInputs: (typeof inputs.$inferSelect)[] = []

    if (evidenceIds.length > 0) {
      evidenceInputs = await db
        .select()
        .from(inputs)
        .where(inArray(inputs.id, evidenceIds))
    }

    return NextResponse.json({
      signal: { ...signal, evidenceInputs },
    })
  } catch (error) {
    console.error('Get signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    const body = await request.json()
    const { status, notes } = body as { status?: string; notes?: string | null }

    if (status === undefined && notes === undefined) {
      return NextResponse.json(
        { error: 'At least one of status or notes must be provided' },
        { status: 400 }
      )
    }

    if (status !== undefined && !SIGNAL_STATUSES.includes(status as typeof SIGNAL_STATUSES[number])) {
      return NextResponse.json(
        { error: 'Invalid status', valid: SIGNAL_STATUSES },
        { status: 422 }
      )
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
    }

    const [existing] = await db
      .select({ id: signals.id })
      .from(signals)
      .where(eq(signals.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    const updateObj: Record<string, unknown> = {}
    if (status !== undefined) updateObj.status = status
    if (notes !== undefined) updateObj.notes = notes

    const [updated] = await db
      .update(signals)
      .set(updateObj)
      .where(eq(signals.id, id))
      .returning()

    return NextResponse.json({ signal: updated })
  } catch (error) {
    console.error('Update signal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
