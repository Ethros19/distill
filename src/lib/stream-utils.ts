// ---------------------------------------------------------------------------
// Stream utilities — derived from distill.config.ts
// ---------------------------------------------------------------------------

import { streams } from '../../distill.config'

// Stream IDs — dynamic array derived from config
export const STREAM_VALUES: string[] = streams.map((s) => s.id)

// Type alias — now a string since streams are configurable
export type Stream = string

// Human-readable labels
export const STREAM_LABELS: Record<string, string> = Object.fromEntries(
  streams.map((s) => [s.id, s.label]),
)

// Short descriptions for radar and LLM prompts
export const STREAM_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  streams.map((s) => [s.id, s.description]),
)

// Hex colors for inline styles
export const STREAM_HEX_COLORS: Record<string, string> = Object.fromEntries(
  streams.map((s) => [s.id, s.hex]),
)

// Pinned stream for radar default ordering
export const PINNED_STREAM: string | null =
  streams.find((s) => s.pinFirst)?.id ?? null

// High-volume streams get a lower query limit in synthesis
export const HIGH_VOLUME_STREAMS: string[] = streams
  .filter((s) => s.highVolume)
  .map((s) => s.id)

// Category-to-stream mapping — derived from config categories
export const CATEGORY_TO_STREAM: Record<string, string> = Object.fromEntries(
  streams.flatMap((s) => (s.categories ?? []).map((cat) => [cat, s.id])),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get hex color for a stream, with fallback */
export function streamHex(stream: string | null | undefined): string {
  return STREAM_HEX_COLORS[stream ?? ''] ?? '#888888'
}

/** Check if a string is a valid configured stream */
export function isValidStream(value: string): boolean {
  return STREAM_VALUES.includes(value)
}

/** Look up the canonical stream for a feed source category */
export function categoryToStream(
  category: string | null | undefined,
): string | null {
  if (!category) return null
  return CATEGORY_TO_STREAM[category] ?? null
}

/**
 * Build the stream description block for LLM prompts.
 * Lists each stream with its description for classification guidance.
 */
export function buildStreamPromptList(): string {
  return streams
    .map((s) => `"${s.id}" (${s.description})`)
    .join(',\n  ')
}
