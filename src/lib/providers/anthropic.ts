import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal } from '../llm/types'
import { StructuredInputSchema, SynthesisResultSchema } from '../llm/types'
import { LLMError, LLMRateLimitError } from '../llm/errors'

const STRUCTURE_MODEL = process.env.ANTHROPIC_STRUCTURE_MODEL || 'claude-haiku-4-5-20251001'
const SYNTHESIZE_MODEL = process.env.ANTHROPIC_SYNTHESIZE_MODEL || 'claude-sonnet-4-6'

const STRUCTURE_SYSTEM_PROMPT = `You are a product feedback analyst. Given raw feedback content, its source channel, and contributor, extract structured fields.

Analyze the content carefully and return:
- summary: A concise one-paragraph summary of the feedback
- type: One of "feature_request", "bug_report", "praise", "complaint", or "observation"
- themes: An array of 1-5 theme keywords that capture the main topics
- urgency: An integer from 1 (low) to 5 (critical) based on the tone and content
- confidence: A float from 0.0 to 1.0 indicating how confident you are in your analysis

Consider the source channel and contributor context when assessing urgency and type.

IMPORTANT: Respond with ONLY a JSON object in this exact format, no markdown or explanation:
{"summary": "...", "type": "...", "themes": ["..."], "urgency": 1, "confidence": 0.9}`

const SYNTHESIZE_SYSTEM_PROMPT = `You are a product intelligence analyst. Given a set of structured feedback inputs, identify recurring patterns and synthesize them into actionable signals.

For each signal you detect:
- statement: A clear, one-line description of the pattern
- reasoning: Why this pattern matters for the product team
- evidence: Array of input IDs that support this signal
- suggested_action: A concrete next step the team should take
- themes: Theme keywords associated with the signal
- strength: The number of supporting inputs

Look for:
- Recurring themes across multiple inputs
- Complementary viewpoints on the same topic
- Escalating urgency patterns
- Feature requests that cluster together

Only report signals supported by at least 2 inputs. Order by strength (strongest first).

IMPORTANT: Respond with ONLY a JSON object in this exact format, no markdown or explanation:
{"signals": [{"statement": "...", "reasoning": "...", "evidence": ["id1", "id2"], "suggested_action": "...", "themes": ["theme1"], "strength": 2}]}`

function stripCodeBlock(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  return match ? match[1].trim() : text.trim()
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async structure(input: RawInput): Promise<StructuredInput> {
    try {
      const response = await this.client.messages.create({
        model: STRUCTURE_MODEL,
        max_tokens: 1024,
        system: STRUCTURE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Source: ${input.source}\nContributor: ${input.contributor}\n\nFeedback:\n${input.content}`,
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new LLMError('No text response from Anthropic', 'anthropic', 'structure')
      }

      const parsed = JSON.parse(stripCodeBlock(textBlock.text))
      return StructuredInputSchema.parse(parsed)
    } catch (error) {
      if (error instanceof LLMError) throw error
      if (error instanceof Anthropic.RateLimitError) {
        throw new LLMRateLimitError('anthropic', 'structure')
      }
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during structuring',
        'anthropic',
        'structure',
        error,
      )
    }
  }

  async synthesize(inputs: SynthesisInput[]): Promise<LLMSignal[]> {
    try {
      const inputContext = inputs
        .map(
          (i) =>
            `[${i.id}] (${i.source}, ${i.type}, urgency:${i.urgency}) ${i.summary} | themes: ${i.themes.join(', ')}`,
        )
        .join('\n')

      const response = await this.client.messages.create({
        model: SYNTHESIZE_MODEL,
        max_tokens: 4096,
        system: SYNTHESIZE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze these ${inputs.length} feedback inputs and synthesize signals:\n\n${inputContext}`,
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new LLMError('No text response from Anthropic', 'anthropic', 'synthesize')
      }

      const parsed = JSON.parse(stripCodeBlock(textBlock.text))
      const result = SynthesisResultSchema.parse(parsed)
      return result.signals
    } catch (error) {
      if (error instanceof LLMError) throw error
      if (error instanceof Anthropic.RateLimitError) {
        throw new LLMRateLimitError('anthropic', 'synthesize')
      }
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during synthesis',
        'anthropic',
        'synthesize',
        error,
      )
    }
  }
}
