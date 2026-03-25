import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs, signals } from '@/lib/schema'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Check if any signal references this input in its evidence array
  const dependentSignals = await db
    .select({ id: signals.id })
    .from(signals)
    .where(sql`${signals.evidence}::jsonb @> ${JSON.stringify([id])}::jsonb`)

  if (dependentSignals.length > 0) {
    return NextResponse.json(
      { error: 'Input is referenced in synthesized signals' },
      { status: 409 }
    )
  }

  await db.delete(inputs).where(eq(inputs.id, id))

  return NextResponse.json({ success: true }, { status: 200 })
}
