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
/**
 * Background color classes per stream — for bars, pills, and distribution charts.
 */
export const STREAM_BG_COLORS: Record<string, string> = {
  'general-ai': 'bg-purple-500',
  'business-dev': 'bg-emerald-500',
  'event-tech': 'bg-orange-500',
  'event-general': 'bg-amber-500',
  'vc-investment': 'bg-blue-500',
  product: 'bg-sig-low',
}

/**
 * Text color classes per stream — for labels and indicators.
 */
export const STREAM_TEXT_COLORS: Record<string, string> = {
  'general-ai': 'text-purple-500',
  'business-dev': 'text-emerald-500',
  'event-tech': 'text-orange-500',
  'event-general': 'text-amber-500',
  'vc-investment': 'text-blue-500',
  product: 'text-sig-low',
}

/**
 * Border-top color classes per stream — for card accents.
 */
export const STREAM_BORDER_COLORS: Record<string, string> = {
  'general-ai': 'border-t-purple-500',
  'business-dev': 'border-t-emerald-500',
  'event-tech': 'border-t-orange-500',
  'event-general': 'border-t-amber-500',
  'vc-investment': 'border-t-blue-500',
  product: 'border-t-sig-low',
}

/**
 * Hex color values per stream — for inline styles and gradients.
 */
export const STREAM_HEX_COLORS: Record<string, string> = {
  'general-ai': '#a855f7',
  'business-dev': '#10b981',
  'event-tech': '#f97316',
  'event-general': '#f59e0b',
  'vc-investment': '#3b82f6',
  product: '#3D8A4A',
}

/**
 * Short stream descriptions for radar page context.
 */
export const STREAM_DESCRIPTIONS: Record<Stream, string> = {
  'general-ai': 'AI model releases, API changes, research breakthroughs, regulation',
  'business-dev': 'AI applications in event planning, vertical SaaS intelligence',
  'event-tech': 'Event platforms, competitor moves, tooling trends',
  'event-general': 'Industry trends, trade shows, hospitality, seasonal demand',
  'vc-investment': 'Funding rounds, M&A activity, startup investments',
  product: 'Direct product feedback, feature requests, user insights',
}

/**
 * Look up the canonical stream for a feed source category.
 * Returns null if the category is null, undefined, or not in the mapping.
 */
export function categoryToStream(category: string | null | undefined): Stream | null {
  if (!category) return null
  return CATEGORY_TO_STREAM[category] ?? null
}
