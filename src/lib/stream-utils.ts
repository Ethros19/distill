// ---------------------------------------------------------------------------
// Stream utilities — canonical stream values and category-to-stream mapping
// ---------------------------------------------------------------------------

export const STREAM_VALUES = ['general-ai', 'business-dev', 'event-tech', 'event-general', 'vc-investment', 'product'] as const

export type Stream = (typeof STREAM_VALUES)[number]

/**
 * Maps every recommended-feeds.ts category to a canonical stream.
 * When new categories are added, extend this mapping.
 */
export const CATEGORY_TO_STREAM: Record<string, Stream> = {
  'AI News': 'general-ai',
  'AI Research': 'general-ai',
  'AI Digest': 'general-ai',
  'LLM/Product': 'general-ai',
  Events: 'event-general',
  Meetings: 'event-general',
  Hospitality: 'event-general',
  'Event Tech': 'event-tech',
  'Competitor Intel': 'event-tech',
  Funding: 'vc-investment',
  Startups: 'vc-investment',
  'SaaS/Business': 'business-dev',
  'Tech Business': 'general-ai',
  'Business Dev': 'business-dev',
  'VC/AI Investment': 'vc-investment',
}

/**
 * Human-readable labels for each stream, used in UI badges and filters.
 */
export const STREAM_LABELS: Record<Stream, string> = {
  'general-ai': 'AI & LLM',
  'business-dev': 'Business Intelligence',
  'event-tech': 'Event Technology',
  'event-general': 'Events & Hospitality',
  'vc-investment': 'VC & Investment',
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
