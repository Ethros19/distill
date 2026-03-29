// ---------------------------------------------------------------------------
// Stream utilities — canonical stream values and category-to-stream mapping
// ---------------------------------------------------------------------------

export const STREAM_VALUES = ['ai', 'events', 'market', 'product'] as const

export type Stream = (typeof STREAM_VALUES)[number]

/**
 * Maps every recommended-feeds.ts category to a canonical stream.
 * When new categories are added, extend this mapping.
 */
export const CATEGORY_TO_STREAM: Record<string, Stream> = {
  'AI News': 'ai',
  'AI Research': 'ai',
  'AI Digest': 'ai',
  'LLM/Product': 'ai',
  Events: 'events',
  Meetings: 'events',
  'Event Tech': 'events',
  Hospitality: 'events',
  Funding: 'market',
  Startups: 'market',
  'SaaS/Business': 'market',
  'Tech Business': 'market',
  'Competitor Intel': 'market',
}

/**
 * Human-readable labels for each stream, used in UI badges and filters.
 */
export const STREAM_LABELS: Record<Stream, string> = {
  ai: 'AI & LLM',
  events: 'Events & Hospitality',
  market: 'Market & Business',
  product: 'Product Feedback',
}

/**
 * Look up the canonical stream for a feed source category.
 * Returns null if the category is null, undefined, or not in the mapping.
 */
export function categoryToStream(category: string | null | undefined): Stream | null {
  if (!category) return null
  return CATEGORY_TO_STREAM[category] ?? null
}
