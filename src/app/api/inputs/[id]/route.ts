import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'

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

  await db.delete(inputs).where(eq(inputs.id, id))

  return NextResponse.json({ success: true }, { status: 200 })
}
