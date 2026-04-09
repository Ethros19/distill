import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'

const KEYS = ['company_name', 'company_logo_url'] as const

export async function GET() {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [...KEYS]))

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return NextResponse.json({
    companyName: map.company_name ?? '',
    companyLogoUrl: map.company_logo_url ?? '',
  })
}

export async function PUT(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    const companyName = formData.get('companyName') as string | null

    if (companyName !== null) {
      await db
        .insert(settings)
        .values({ key: 'company_name', value: companyName })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: companyName, updatedAt: new Date() },
        })
    }

    if (file && file.size > 0) {
      const blob = await put(`branding/logo-${Date.now()}.${file.name.split('.').pop()}`, file, {
        access: 'public',
        addRandomSuffix: false,
      })

      await db
        .insert(settings)
        .values({ key: 'company_logo_url', value: blob.url })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: blob.url, updatedAt: new Date() },
        })
    }

    return NextResponse.json({ ok: true })
  }

  const body = await request.json()

  if (body.companyName !== undefined) {
    await db
      .insert(settings)
      .values({ key: 'company_name', value: body.companyName })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: body.companyName, updatedAt: new Date() },
      })
  }

  if (body.companyLogoUrl !== undefined) {
    await db
      .insert(settings)
      .values({ key: 'company_logo_url', value: body.companyLogoUrl })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: body.companyLogoUrl, updatedAt: new Date() },
      })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await db.delete(settings).where(eq(settings.key, 'company_logo_url'))
  return NextResponse.json({ ok: true })
}
