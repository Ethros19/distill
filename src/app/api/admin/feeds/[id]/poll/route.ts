import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { feedSources } from '@/lib/schema'
import { pollFeed } from '@/lib/feed-poller'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    // Fetch feed by ID — do NOT filter by enabled (Poll Now works on disabled feeds)
    const [feed] = await db
      .select()
      .from(feedSources)
      .where(eq(feedSources.id, id))

    if (!feed) {
      return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
    }

    try {
      const newItems = await pollFeed(feed)

      // Update lastPolledAt and clear any previous error (pollFeed does not do this)
      await db
        .update(feedSources)
        .set({ lastPolledAt: new Date(), lastError: null })
        .where(eq(feedSources.id, id))

      return NextResponse.json({ newItems })
    } catch (pollError) {
      const message = pollError instanceof Error ? pollError.message : String(pollError)

      // Write error to feed record
      await db
        .update(feedSources)
        .set({ lastError: message })
        .where(eq(feedSources.id, id))

      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('Poll feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
