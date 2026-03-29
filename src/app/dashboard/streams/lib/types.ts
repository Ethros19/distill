// ---------------------------------------------------------------------------
// Stream intelligence data types — consumed by stream dashboard components
// ---------------------------------------------------------------------------

/** Per-stream input count */
export interface StreamVolume {
  stream: string
  count: number
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

/** Combined return type for getStreamIntelligence() */
export interface StreamIntelligenceData {
  volume: StreamVolume[]
  themes: StreamTheme[]
  articles: StreamArticle[]
}
