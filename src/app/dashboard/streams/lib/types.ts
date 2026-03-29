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

// ---------------------------------------------------------------------------
// Synthesis scope types — Phase 03 streams synthesis view
// ---------------------------------------------------------------------------

/** A synthesis run record with metadata */
export interface SynthesisRecord {
  id: string
  createdAt: Date
  periodStart: Date
  periodEnd: Date
  inputCount: number
  signalCount: number
  digestMarkdown: string | null
  industryInputIds: string[] | null
  trigger: string
}

/** A signal extracted from a synthesis run */
export interface SynthesisSignal {
  id: string
  statement: string
  reasoning: string
  themes: string[]
  strength: number
  status: string
  suggestedAction: string
  evidenceInputIds: string[]
}

/** An industry input that was in context during synthesis */
export interface IndustryInput {
  id: string
  summary: string
  stream: string | null
  themes: string[]
  urgency: number
  source: string
  publishedAt: Date | null
  feedUrl: string | null
}

/** A signal whose themes are validated by cross-stream industry coverage */
export interface MarketValidation {
  signalId: string
  signalStatement: string
  signalStrength: number
  validatingThemes: string[]
  industryStreamCount: number
  matchingStreams: string[]
}

/** Per-stream view of synthesis: industry inputs and connected signals */
export interface PerStreamSynthesis {
  stream: string
  industryInputCount: number
  topIndustryInputs: IndustryInput[]
  connectedSignals: SynthesisSignal[]
  topThemes: string[]
}

/** Combined return type for getSynthesisScopeData() */
export interface SynthesisScopeData {
  synthesis: SynthesisRecord | null
  signals: SynthesisSignal[]
  industryInputs: IndustryInput[]
  marketValidations: MarketValidation[]
  perStreamSynthesis: PerStreamSynthesis[]
  crossStreamThemes: { theme: string; streamCount: number; streams: string[]; signalCount: number }[]
}
