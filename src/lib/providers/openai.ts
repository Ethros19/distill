import OpenAI from 'openai'
import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal, PriorSignal } from '../llm/types'
import { StructuredInputSchema, SynthesisResultSchema } from '../llm/types'
import { LLMError, LLMRateLimitError } from '../llm/errors'

const STRUCTURE_MODEL = process.env.OPENAI_STRUCTURE_MODEL || 'gpt-4o-mini'
const SYNTHESIZE_MODEL = process.env.OPENAI_SYNTHESIZE_MODEL || 'gpt-4o'

const STRUCTURE_SYSTEM_PROMPT = `You are a product feedback analyst. Given raw feedback content, its source channel, and contributor, extract structured fields.

Analyze the content carefully and return:
- summary: A concise one-paragraph summary of the feedback
- type: One of "feature_request", "bug_report", "praise", "complaint", or "observation"
- themes: An array of 1-5 theme keywords that capture the main topics
- urgency: An integer from 1 (low) to 5 (critical) based on the tone and content
- confidence: A float from 0.0 to 1.0 indicating how confident you are in your analysis

Consider the source channel and contributor context when assessing urgency and type.`

const SYNTHESIZE_SYSTEM_PROMPT = `You are a product intelligence analyst. Given a set of structured feedback inputs, identify recurring patterns and synthesize them into actionable signals.

CRITICAL RULES:
1. ONE SIGNAL PER TOPIC: Never produce multiple signals about the same subject. WRONG: 3 signals all about "budget". RIGHT: merge into one signal.
2. BE SPECIFIC: Name the exact feature gap. WRONG: "Budget management is a pain point". RIGHT: "No spending limits causes surprise invoices".
3. ASSIGNABLE ACTIONS: WRONG: "Improve budget". RIGHT: "Add budget cap field with alerts at 80%/100%".
4. MAX 3-7 SIGNALS: Merge aggressively.

For each signal you detect:
- statement: A specific, one-line finding that names the exact gap or pain point (not a category summary)
- reasoning: Why this matters — what user pain or business impact does it cause?
- evidence: Array of input IDs that support this signal
- suggested_action: A concrete next step assignable to a team member
- themes: Theme keywords associated with the signal
- strength: The number of supporting inputs

Look for:
- Specific feature gaps or missing capabilities cited by multiple users
- Workflow bottlenecks where users describe concrete friction
- Escalating urgency patterns indicating growing pain
- Complementary requests that point to the same underlying need

Only report signals supported by at least 2 inputs. Order by strength (strongest first).

HANDLING PREVIOUSLY IDENTIFIED SIGNALS:
You may receive a list of signals the team has already triaged. For each:
- "acknowledged" or "in_progress": Do NOT re-surface this signal unless new inputs show SIGNIFICANT escalation (e.g., urgency jumped, new users affected, or a meaningfully different angle). If you do re-surface it, explain what changed.
- "resolved": Do NOT re-surface unless new inputs indicate a regression or the fix did not address the issue.
- If no prior signals are provided, ignore this section.`

// JSON schemas for OpenAI structured outputs (strict: true requires additionalProperties: false)
const STRUCTURED_INPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One-paragraph summary of the feedback' },
    type: {
      type: 'string',
      enum: ['feature_request', 'bug_report', 'praise', 'complaint', 'observation'],
      description: 'Category of the feedback',
    },
    themes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of theme keywords extracted from the content',
    },
    urgency: {
      type: 'integer',
      description: 'Urgency score from 1 (low) to 5 (critical)',
    },
    confidence: {
      type: 'number',
      description: 'Confidence in the structuring accuracy from 0.0 to 1.0',
    },
  },
  required: ['summary', 'type', 'themes', 'urgency', 'confidence'],
  additionalProperties: false,
} as const

const SYNTHESIS_RESULT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statement: { type: 'string', description: 'One-line signal statement describing the pattern' },
          reasoning: { type: 'string', description: 'Why this pattern matters for the product' },
          evidence: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of input IDs that support this signal',
          },
          suggested_action: { type: 'string', description: 'Recommended next step for the product team' },
          themes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Theme keywords associated with this signal',
          },
          strength: { type: 'integer', description: 'Number of supporting inputs' },
        },
        required: ['statement', 'reasoning', 'evidence', 'suggested_action', 'themes', 'strength'],
        additionalProperties: false,
      },
    },
  },
  required: ['signals'],
  additionalProperties: false,
} as const

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async structure(input: RawInput): Promise<StructuredInput> {
    try {
      const response = await this.client.chat.completions.create({
        model: STRUCTURE_MODEL,
        messages: [
          { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Source: ${input.source}\nContributor: ${input.contributor}\n\nFeedback:\n${input.content}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'StructuredInput',
            schema: STRUCTURED_INPUT_JSON_SCHEMA,
            strict: true,
          },
        },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new LLMError('No content in OpenAI response', 'openai', 'structure')
      }

      return StructuredInputSchema.parse(JSON.parse(content))
    } catch (error) {
      if (error instanceof LLMError) throw error
      if (error instanceof OpenAI.RateLimitError) {
        throw new LLMRateLimitError('openai', 'structure')
      }
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during structuring',
        'openai',
        'structure',
        error,
      )
    }
  }

  async synthesize(inputs: SynthesisInput[], priorSignals?: PriorSignal[]): Promise<LLMSignal[]> {
    try {
      const inputContext = inputs
        .map(
          (i) =>
            `[${i.id}] (${i.source}, ${i.type}, urgency:${i.urgency}) ${i.summary} | themes: ${i.themes.join(', ')}`,
        )
        .join('\n')

      let userContent = `Analyze these ${inputs.length} feedback inputs and synthesize signals:\n\n${inputContext}`

      if (priorSignals && priorSignals.length > 0) {
        const priorContext = priorSignals
          .map((s) => `- [${s.status}] "${s.statement}" (strength: ${s.strength}, themes: ${s.themes.join(', ')})`)
          .join('\n')
        userContent += `\n\nPREVIOUSLY IDENTIFIED SIGNALS (already triaged by the team):\n${priorContext}`
      }

      const response = await this.client.chat.completions.create({
        model: SYNTHESIZE_MODEL,
        messages: [
          { role: 'system', content: SYNTHESIZE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'SynthesisResult',
            schema: SYNTHESIS_RESULT_JSON_SCHEMA,
            strict: true,
          },
        },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new LLMError('No content in OpenAI response', 'openai', 'synthesize')
      }

      const result = SynthesisResultSchema.parse(JSON.parse(content))
      return result.signals
    } catch (error) {
      if (error instanceof LLMError) throw error
      if (error instanceof OpenAI.RateLimitError) {
        throw new LLMRateLimitError('openai', 'synthesize')
      }
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during synthesis',
        'openai',
        'synthesize',
        error,
      )
    }
  }
}
