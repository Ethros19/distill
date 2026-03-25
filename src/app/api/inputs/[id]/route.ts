import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs, signals } from '@/lib/schema'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
