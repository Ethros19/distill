import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs, signals } from '@/lib/schema'

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
    const { notes, is_feedback } = body as { notes?: string; is_feedback?: boolean }

    // At least one field must be provided
    if (notes === undefined && is_feedback === undefined) {
      return NextResponse.json(
        { error: 'At least one of notes or is_feedback must be provided' },
        { status: 400 },
      )
    }

    // Validate types
    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string' }, { status: 400 })
    }
    if (is_feedback !== undefined && typeof is_feedback !== 'boolean') {
      return NextResponse.json({ error: 'is_feedback must be a boolean' }, { status: 400 })
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

    const [existing] = await db
      .select({ id: inputs.id })
      .from(inputs)
      .where(eq(inputs.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Input not found' }, { status: 404 })
    }

    // Check dependency and delete atomically to prevent race conditions
    await db.transaction(async (tx) => {
      const dependentSignals = await tx
        .select({ id: signals.id })
        .from(signals)
        .where(sql`${signals.evidence}::jsonb @> ${JSON.stringify([id])}::jsonb`)

      if (dependentSignals.length > 0) {
        throw new Error('CONFLICT: Input is referenced in synthesized signals')
      }

      await tx.delete(inputs).where(eq(inputs.id, id))
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
      return NextResponse.json(
        { error: 'Input is referenced in synthesized signals' },
        { status: 409 }
      )
    }
    console.error('Delete input error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
