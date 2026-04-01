import { z } from 'zod'
import { STREAM_VALUES } from '../stream-utils'

function dynamicStreamEnum() {
  if (STREAM_VALUES.length >= 2) {
    return z.enum(STREAM_VALUES as [string, string, ...string[]])
  }
  if (STREAM_VALUES.length === 1) {
    return z.literal(STREAM_VALUES[0])
  }
  return z.string()
}

// Input to the structurer
export interface RawInput {
  content: string
  source: string
  contributor: string
}

// Output from the structurer — matches the inputs table fields populated by AI
export const StructuredInputSchema = z.object({
  summary: z.string().describe('One-paragraph summary of the feedback'),
  type: z
    .enum(['feature_request', 'bug_report', 'praise', 'complaint', 'observation'])
    .describe('Category of the feedback'),
  themes: z.array(z.string()).describe('Array of theme keywords extracted from the content'),
  urgency: z.number().int().min(1).max(5).describe('Urgency score from 1 (low) to 5 (critical)'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the structuring accuracy from 0.0 to 1.0'),
  is_feedback: z
    .boolean()
    .describe(
      'Whether the content is genuine product feedback (true) vs noise like login codes, transactional emails, auto-replies, CVs, spam (false)',
    ),
  stream: dynamicStreamEnum()
    .nullable()
    .optional()
    .describe(
      `Domain stream — one of: ${STREAM_VALUES.join(', ')}. Null if unclear.`,
    ),
})

export type StructuredInput = z.infer<typeof StructuredInputSchema>

// Input to the synthesizer — structured inputs ready for clustering
export interface SynthesisInput {
  id: string
  summary: string
  type: string
  themes: string[]
  urgency: number
  source: string
  notes?: string
  stream?: string
}

// Prior signal context for cross-synthesis dedup
export interface PriorSignal {
  statement: string
  status: string
  themes: string[]
  strength: number
  notes?: string
}

// Output from the synthesizer — a detected signal
export const LLMSignalSchema = z.object({
  statement: z.string().describe('One-line signal statement describing the pattern'),
  reasoning: z.string().describe('Why this pattern matters for the product'),
  evidence: z.array(z.string()).describe('Array of input IDs that support this signal'),
  suggested_action: z.string().describe('Recommended next step for the product team'),
  themes: z.array(z.string()).describe('Theme keywords associated with this signal'),
  strength: z.number().int().min(1).describe('Number of supporting inputs'),
})

export type LLMSignal = z.infer<typeof LLMSignalSchema>

export const SynthesisResultSchema = z.object({
  signals: z.array(LLMSignalSchema),
})

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>
