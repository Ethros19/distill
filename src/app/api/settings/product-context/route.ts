import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const KEY = 'product_context'

export async function GET() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, KEY))

  return NextResponse.json({ productContext: row?.value ?? '' })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { productContext } = body

  if (typeof productContext !== 'string') {
    return NextResponse.json({ error: 'productContext must be a string' }, { status: 422 })
  }

  await db
    .insert(settings)
    .values({ key: KEY, value: productContext })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: productContext, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
