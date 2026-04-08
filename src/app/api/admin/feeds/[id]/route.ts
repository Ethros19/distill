import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { feedSources, inputs } from '@/lib/schema'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const URL_REGEX = /^https?:\/\/.+/i

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
    const { name, url, category, enabled } = body as {
      name?: string
      url?: string
      category?: string | null
      enabled?: boolean
    }

    // At least one field must be provided
    if (
      name === undefined &&
      url === undefined &&
      category === undefined &&
      enabled === undefined
    ) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 },
      )
    }

    // Validate provided fields
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
      }
      if (name.trim().length > 100) {
        return NextResponse.json({ error: 'name must be 100 characters or fewer' }, { status: 400 })
      }
    }
    if (url !== undefined) {
      if (typeof url !== 'string' || !URL_REGEX.test(url.trim())) {
        return NextResponse.json({ error: 'url must be a valid HTTP(S) URL' }, { status: 400 })
      }
    }
    if (category !== undefined && category !== null && typeof category !== 'string') {
      return NextResponse.json({ error: 'category must be a string or null' }, { status: 400 })
    }
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    // Check feed exists
    const [existing] = await db
      .select({ id: feedSources.id })
      .from(feedSources)
      .where(eq(feedSources.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
    }

    // If URL is being changed, check uniqueness
    if (url !== undefined) {
      const [conflict] = await db
        .select({ id: feedSources.id })
        .from(feedSources)
        .where(eq(feedSources.url, url.trim()))

      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: 'A feed source with this URL already exists', conflict: 'duplicate' },
          { status: 409 },
        )
      }
    }

    // Build update object from provided fields
    const updateObj: Record<string, unknown> = {}
    if (name !== undefined) updateObj.name = name.trim()
    if (url !== undefined) updateObj.url = url.trim()
    if (category !== undefined) updateObj.category = category?.trim() || null
    if (enabled !== undefined) updateObj.enabled = enabled

    const [updated] = await db
      .update(feedSources)
      .set(updateObj)
      .where(eq(feedSources.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update feed source error:', error)
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

    // Check feed exists
    const [existing] = await db
      .select({ id: feedSources.id })
      .from(feedSources)
      .where(eq(feedSources.id, id))

    if (!existing) {
      return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
    }

    // Nullify feedSourceId on related inputs before deleting the feed source.
    // This preserves historical input records (no cascade delete) while
    // satisfying the FK constraint (Drizzle default is NO ACTION).
    await db
      .update(inputs)
      .set({ feedSourceId: null })
      .where(eq(inputs.feedSourceId, id))

    await db.delete(feedSources).where(eq(feedSources.id, id))

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Delete feed source error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
