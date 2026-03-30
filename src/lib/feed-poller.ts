import crypto from 'crypto'
import Parser from 'rss-parser'
import { eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { feedSources, inputs, type FeedSource } from '@/lib/schema'
import { structureInput } from '@/lib/structurer'
import { getLLMProvider } from '@/lib/llm/provider-factory'
import { categoryToStream } from '@/lib/stream-utils'

const parser = new Parser()

const FEED_TIMEOUT_MS = 8_000
const MAX_ITEMS_PER_POLL = 50

/**
 * Poll a single feed source: fetch, parse, dedup, insert, and trigger structuring.
 * Returns the count of new items inserted.
 */
export async function pollFeed(feedSource: FeedSource): Promise<number> {
  const feed = await Promise.race([
    parser.parseURL(feedSource.url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Feed fetch timed out')), FEED_TIMEOUT_MS),
    ),
  ])

  // Cap items per poll to prevent archive-style feeds from flooding the system
  const items = feed.items.slice(0, MAX_ITEMS_PER_POLL)

  let newCount = 0

  for (const item of items) {
    if (!item.link) continue

    // Normalize URL for consistent hashing (trim, remove trailing slash)
    const normalizedUrl = item.link.trim().replace(/\/+$/, '')
    const contentHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex')

    // Dedup by both content hash (URL hash) and raw feed URL
    const existing = await db.query.inputs.findFirst({
      where: or(
        eq(inputs.contentHash, contentHash),
        eq(inputs.feedUrl, item.link),
      ),
    })

    if (existing) continue

    const rawContent = item.title
      ? `${item.title}\n\n${item.contentSnippet || item.content || ''}`
      : item.contentSnippet || item.content || ''

    if (!rawContent.trim()) continue

    const result = await db
      .insert(inputs)
      .values({
        source: 'rss',
        contributor: feedSource.name,
        rawContent,
        contentHash,
        status: 'unprocessed',
        stream: categoryToStream(feedSource.category),
        feedSourceId: feedSource.id,
        feedUrl: item.link,
        publishedAt: item.isoDate ? new Date(item.isoDate) : null,
      })
      .returning()

    const inputId = result[0].id
    newCount++

    // Fire async structuring (non-blocking, same pattern as paste/email)
    const provider = getLLMProvider()
    structureInput(rawContent, 'rss', feedSource.name, provider)
      .then(async (structured) => {
        await db
          .update(inputs)
          .set({
            summary: structured.summary,
            type: structured.type,
            themes: structured.themes,
            urgency: structured.urgency,
            confidence: structured.confidence,
            isFeedback: structured.is_feedback,
            status: 'processed',
          })
          .where(eq(inputs.id, inputId))
      })
      .catch((error) => {
        console.error(`Feed structuring failed for input ${inputId}:`, error)
      })
  }

  return newCount
}

/**
 * Poll all enabled feed sources that are due based on their polling interval.
 * Returns a summary of feeds polled and new items inserted.
 */
export async function pollAllDueFeeds(): Promise<{
  feedsPolled: number
  newItems: number
  errors: string[]
}> {
  const now = new Date()

  // Find enabled feeds where lastPolledAt is null or interval has elapsed
  const allEnabled = await db
    .select()
    .from(feedSources)
    .where(eq(feedSources.enabled, true))

  const dueFeeds = allEnabled.filter((feed) => {
    if (!feed.lastPolledAt) return true
    const elapsed = now.getTime() - feed.lastPolledAt.getTime()
    return elapsed >= feed.pollingInterval * 60_000
  })

  const summary = { feedsPolled: 0, newItems: 0, errors: [] as string[] }

  for (const feed of dueFeeds) {
    try {
      const count = await pollFeed(feed)
      summary.newItems += count
      summary.feedsPolled++

      // Update lastPolledAt and clear any previous error
      await db
        .update(feedSources)
        .set({ lastPolledAt: now, lastError: null })
        .where(eq(feedSources.id, feed.id))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed to poll feed "${feed.name}" (${feed.url}):`, message)
      summary.errors.push(`${feed.name}: ${message}`)

      // Write error to feed record but continue processing other feeds
      await db
        .update(feedSources)
        .set({ lastError: message })
        .where(eq(feedSources.id, feed.id))
    }
  }

  return summary
}
