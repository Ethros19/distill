import crypto from 'crypto'
import Parser from 'rss-parser'
import { eq, inArray } from 'drizzle-orm'
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

  // Pre-compute hashes for all items with links
  const candidates = items
    .filter((item) => item.link)
    .map((item) => {
      const normalizedUrl = item.link!.trim().replace(/\/+$/, '')
      return {
        item,
        normalizedUrl,
        contentHash: crypto.createHash('sha256').update(normalizedUrl).digest('hex'),
      }
    })

  if (candidates.length === 0) return 0

  // Batch dedup: single query for all hashes and URLs
  const allHashes = candidates.map((c) => c.contentHash)
  const allUrls = candidates.map((c) => c.item.link!)
  const existingRows = await db
    .select({ contentHash: inputs.contentHash, feedUrl: inputs.feedUrl })
    .from(inputs)
    .where(inArray(inputs.contentHash, allHashes))

  const existingUrlRows = await db
    .select({ feedUrl: inputs.feedUrl })
    .from(inputs)
    .where(inArray(inputs.feedUrl, allUrls))

  const existingHashes = new Set(existingRows.map((r) => r.contentHash))
  const existingUrls = new Set(existingUrlRows.map((r) => r.feedUrl))

  // Filter to genuinely new items
  const newCandidates = candidates.filter(
    (c) => !existingHashes.has(c.contentHash) && !existingUrls.has(c.item.link!),
  )

  let newCount = 0

  // Batch insert new items
  const toInsert = newCandidates
    .map((c) => {
      const rawContent = c.item.title
        ? `${c.item.title}\n\n${c.item.contentSnippet || c.item.content || ''}`
        : c.item.contentSnippet || c.item.content || ''
      if (!rawContent.trim()) return null
      return {
        source: 'rss' as const,
        contributor: feedSource.name,
        rawContent,
        contentHash: c.contentHash,
        status: 'unprocessed' as const,
        stream: categoryToStream(feedSource.category),
        feedSourceId: feedSource.id,
        feedUrl: c.item.link!,
        publishedAt: c.item.isoDate ? new Date(c.item.isoDate) : null,
      }
    })
    .filter((v) => v != null)

  if (toInsert.length === 0) return 0

  const inserted = await db.insert(inputs).values(toInsert).returning({ id: inputs.id, rawContent: inputs.rawContent })
  newCount = inserted.length

  // Fire async structuring for all new items (non-blocking)
  const provider = getLLMProvider()
  for (const row of inserted) {
    structureInput(row.rawContent, 'rss', feedSource.name, provider)
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
          .where(eq(inputs.id, row.id))
      })
      .catch((error) => {
        console.error(`Feed structuring failed for input ${row.id}:`, error)
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
