import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal, PriorSignal } from '../llm/types'
import { StructuredInputSchema, SynthesisResultSchema } from '../llm/types'
import { LLMError } from '../llm/errors'

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const STRUCTURE_MODEL = process.env.OLLAMA_STRUCTURE_MODEL || 'llama3.2'
const SYNTHESIZE_MODEL = process.env.OLLAMA_SYNTHESIZE_MODEL || 'llama3.2'

const STRUCTURE_SYSTEM_PROMPT = `You are a product feedback analyst. Given raw feedback content, its source channel, and contributor, extract structured fields.

Analyze the content carefully and return:
- summary: A concise one-paragraph summary of the feedback
- type: One of "feature_request", "bug_report", "praise", "complaint", or "observation"
- themes: An array of 1-5 theme keywords that capture the main topics
- urgency: An integer from 1 (low) to 5 (critical) based on the tone and content
- confidence: A float from 0.0 to 1.0 indicating how confident you are in your analysis
- is_feedback: Boolean — true if the content is genuine product feedback (feature requests, bug reports, complaints, praise, observations). false if the content is noise: login verification codes, password resets, transactional receipts, automated notifications, CVs/resumes, spam, or non-product content

Consider the source channel and contributor context when assessing urgency and type.

You MUST respond with valid JSON only. No markdown formatting, no explanation, just the JSON object.
IMPORTANT: Respond with ONLY a JSON object in this exact format, no markdown or explanation:
{"summary": "...", "type": "...", "themes": ["..."], "urgency": 1, "confidence": 0.9, "is_feedback": true}`

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

HANDLING PRODUCT CONTEXT:
You may receive a "CURRENT PRODUCT STATE" section listing features already shipped. Use it to:
- NEVER signal a feature gap that is already listed as shipped/built.
- Focus on what is specifically MISSING or BROKEN relative to what exists.
- If feedback mentions a feature that exists, check whether the request is about a missing sub-feature or enhancement rather than the feature itself.

HANDLING PREVIOUSLY IDENTIFIED SIGNALS:
You may receive a list of signals the team has already triaged. For each:
- "acknowledged" or "in_progress": Do NOT re-surface this signal unless new inputs show SIGNIFICANT escalation (e.g., urgency jumped, new users affected, or a meaningfully different angle). If you do re-surface it, explain what changed.
- "resolved": Do NOT re-surface unless new inputs indicate a regression or the fix did not address the issue.
- If no prior signals are provided, ignore this section.

You MUST respond with valid JSON only. No markdown formatting, no explanation, just the JSON object.
IMPORTANT: Respond with ONLY a JSON object in this exact format, no markdown or explanation:
{"signals": [{"statement": "...", "reasoning": "...", "evidence": ["id1", "id2"], "suggested_action": "...", "themes": ["theme1"], "strength": 2}]}`

function stripCodeBlock(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  return match ? match[1].trim() : text.trim()
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string

  constructor() {
    this.baseUrl = BASE_URL
  }

  async structure(input: RawInput): Promise<StructuredInput> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: STRUCTURE_MODEL,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Source: ${input.source}\nContributor: ${input.contributor}\n\nFeedback:\n${input.content}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new LLMError(
          `Ollama returned ${response.status}: ${response.statusText}`,
          'ollama',
          'structure',
        )
      }

      const data = await response.json()
      const content = data?.message?.content
      if (!content) {
        throw new LLMError('No content in Ollama response', 'ollama', 'structure')
      }

      const parsed = JSON.parse(stripCodeBlock(content))
      return StructuredInputSchema.parse(parsed)
    } catch (error) {
      if (error instanceof LLMError) throw error
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during structuring',
        'ollama',
        'structure',
        error,
      )
    }
  }

  async synthesize(inputs: SynthesisInput[], priorSignals?: PriorSignal[], productContext?: string): Promise<LLMSignal[]> {
    try {
      const inputContext = inputs
        .map(
          (i) =>
            `[${i.id}] (${i.source}, ${i.type}, urgency:${i.urgency}) ${i.summary} | themes: ${i.themes.join(', ')}${i.notes ? ` | note: ${i.notes}` : ''}`,
        )
        .join('\n')

      let userContent = `Analyze these ${inputs.length} feedback inputs and synthesize signals:\n\n${inputContext}`

      if (productContext) {
        userContent += `\n\nCURRENT PRODUCT STATE (features already shipped):\n${productContext}`
      }

      if (priorSignals && priorSignals.length > 0) {
        const priorContext = priorSignals
          .map((s) => `- [${s.status}] "${s.statement}" (strength: ${s.strength}, themes: ${s.themes.join(', ')})${s.notes ? ` | note: ${s.notes}` : ''}`)
          .join('\n')
        userContent += `\n\nPREVIOUSLY IDENTIFIED SIGNALS (already triaged by the team):\n${priorContext}`
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: SYNTHESIZE_MODEL,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: SYNTHESIZE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: userContent,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new LLMError(
          `Ollama returned ${response.status}: ${response.statusText}`,
          'ollama',
          'synthesize',
        )
      }

      const data = await response.json()
      const content = data?.message?.content
      if (!content) {
        throw new LLMError('No content in Ollama response', 'ollama', 'synthesize')
      }

      const parsed = JSON.parse(stripCodeBlock(content))
      const result = SynthesisResultSchema.parse(parsed)
      return result.signals
    } catch (error) {
      if (error instanceof LLMError) throw error
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error during synthesis',
        'ollama',
        'synthesize',
        error,
      )
    }
  }
}
