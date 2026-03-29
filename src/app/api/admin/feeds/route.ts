import { NextRequest, NextResponse } from 'next/server'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { feedSources, inputs } from '@/lib/schema'

export async function GET() {
  try {
    // Query all feed sources with input count per feed
    const rows = await db
      .select({
        id: feedSources.id,
        createdAt: feedSources.createdAt,
        name: feedSources.name,
        url: feedSources.url,
        category: feedSources.category,
        pollingInterval: feedSources.pollingInterval,
        enabled: feedSources.enabled,
        lastPolledAt: feedSources.lastPolledAt,
        lastError: feedSources.lastError,
        inputCount: sql<number>`count(${inputs.id})::int`,
      })
      .from(feedSources)
      .leftJoin(inputs, eq(inputs.feedSourceId, feedSources.id))
      .groupBy(feedSources.id)
      .orderBy(desc(feedSources.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('List feed sources error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const URL_REGEX = /^https?:\/\/.+/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, name, category, pollingInterval } = body as {
      url?: string
      name?: string
      category?: string
      pollingInterval?: number
    }

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }
    if (!URL_REGEX.test(url.trim())) {
      return NextResponse.json({ error: 'url must be a valid HTTP(S) URL' }, { status: 400 })
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'name must be 100 characters or fewer' }, { status: 400 })
    }

    // Validate optional fields
    if (category !== undefined && typeof category !== 'string') {
      return NextResponse.json({ error: 'category must be a string' }, { status: 400 })
    }
    if (pollingInterval !== undefined) {
      if (typeof pollingInterval !== 'number' || pollingInterval < 1) {
        return NextResponse.json({ error: 'pollingInterval must be a positive integer' }, { status: 400 })
      }
    }

    // Check URL uniqueness
    const [existing] = await db
      .select({ id: feedSources.id })
      .from(feedSources)
      .where(eq(feedSources.url, url.trim()))

    if (existing) {
      return NextResponse.json(
        { error: 'A feed source with this URL already exists', conflict: 'duplicate' },
        { status: 409 },
      )
    }

    // Insert new feed source
    const [created] = await db
      .insert(feedSources)
      .values({
        url: url.trim(),
        name: name.trim(),
        category: category?.trim() || null,
        pollingInterval: pollingInterval ?? 60,
        enabled: true,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Create feed source error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
