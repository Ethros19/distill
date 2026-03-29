import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs, signals } from '@/lib/schema'
import { STREAM_VALUES } from '@/lib/stream-utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    const { notes, is_feedback, stream } = body as { notes?: string; is_feedback?: boolean; stream?: string | null }

    // At least one field must be provided
    if (notes === undefined && is_feedback === undefined && stream === undefined) {
      return NextResponse.json(
        { error: 'At least one of notes, is_feedback, or stream must be provided' },
        { status: 400 },
      )
    }

    // Validate types
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
    }
    if (is_feedback !== undefined && typeof is_feedback !== 'boolean') {
      return NextResponse.json({ error: 'is_feedback must be a boolean' }, { status: 400 })
    }
    if (stream !== undefined && stream !== null && !(STREAM_VALUES as readonly string[]).includes(stream)) {
      return NextResponse.json({ error: `stream must be one of: ${STREAM_VALUES.join(', ')} or null` }, { status: 400 })
    }

    // Check input exists
    const [existing] = await db
      .select({ id: inputs.id })
      .from(inputs)
      .where(eq(inputs.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Input not found' }, { status: 404 })
    }

    // Build update object from provided fields
    const updateObj: Record<string, unknown> = {}
    if (notes !== undefined) updateObj.notes = notes
    if (is_feedback !== undefined) updateObj.isFeedback = is_feedback
    if (stream !== undefined) updateObj.stream = stream

    const [updated] = await db
      .update(inputs)
      .set(updateObj)
      .where(eq(inputs.id, id))
      .returning()

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Patch input error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    const force = new URL(request.url).searchParams.get('force') === 'true'

    const [existing] = await db
      .select({ id: inputs.id })
      .from(inputs)
      .where(eq(inputs.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Input not found' }, { status: 404 })
    }

    // Check for dependent signals
    const dependentSignals = await db
      .select({ id: signals.id })
      .from(signals)
      .where(sql`${signals.evidence}::jsonb @> ${JSON.stringify([id])}::jsonb`)

    if (dependentSignals.length > 0 && !force) {
      return NextResponse.json(
        { error: 'Input is referenced in synthesized signals' },
        { status: 409 }
      )
    }

    if (dependentSignals.length > 0 && force) {
      // Strip the input UUID from evidence arrays, then delete — use transaction for atomicity
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`UPDATE signals SET evidence = COALESCE(
            (SELECT jsonb_agg(elem) FROM jsonb_array_elements(evidence) AS elem WHERE elem != to_jsonb(${id}::text)),
            '[]'::jsonb
          ) WHERE evidence::jsonb @> ${JSON.stringify([id])}::jsonb`
        )
        await tx.delete(inputs).where(eq(inputs.id, id))
      })
      return NextResponse.json({ success: true, strippedSignals: dependentSignals.length }, { status: 200 })
    }

    // No dependent signals — simple delete, no transaction needed
    await db.delete(inputs).where(eq(inputs.id, id))
    return NextResponse.json({ success: true, strippedSignals: 0 }, { status: 200 })
  } catch (error) {
    console.error('Delete input error:', error instanceof Error ? error.message : error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
