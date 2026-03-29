// ---------------------------------------------------------------------------
// Stream intelligence data types — consumed by stream dashboard components
// ---------------------------------------------------------------------------

/** Trend direction for stream volume comparison */
export type TrendDirection = 'rising' | 'falling' | 'stable'

/** Per-stream input count with optional trend data */
export interface StreamVolume {
  stream: string
  count: number
  priorCount?: number
  trend?: TrendDirection
}

/** Per-stream theme with frequency (post-normalization) */
export interface StreamTheme {
  stream: string
  theme: string
  freq: number
}

/** High-urgency article summary for a stream */
export interface StreamArticle {
  id: string
  stream: string | null
  summary: string | null
  urgency: number | null
  createdAt: Date
  feedUrl: string | null
}

/** Theme that appears across multiple streams */
export interface CrossStreamTheme {
  theme: string
  streamCount: number
  totalFreq: number
  streams: string[]
}

/** Combined return type for getStreamIntelligence() */
export interface StreamIntelligenceData {
  volume: StreamVolume[]
  themes: StreamTheme[]
  articles: StreamArticle[]
  crossStreamThemes: CrossStreamTheme[]
}
