import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal, PriorSignal } from '../llm/types'
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
- is_feedback: Boolean — true if the content is genuine product feedback (feature requests, bug reports, complaints, praise, observations). false if the content is noise: login verification codes, password resets, transactional receipts, automated notifications, CVs/resumes, spam, or non-product content
- stream: Classify the domain stream of this content. Use one of:
  "general-ai" (AI/LLM technology news, model releases, open-source AI, API changes, AI regulation, research papers),
  "piper-dev" (AI applications in event budgeting and planning, event industry business intelligence, vertical SaaS for events, event management software business),
  "event-tech" (event technology platforms and competition, software tooling trends like Cvent/Eventbrite/Bizzabo, event tech product launches),
  "event-general" (event industry news, trade shows, hospitality trends, seasonal demand, meeting planning, venue management),
  "vc-investment" (VC funding rounds, M&A activity, AI startup investments, venture capital deals, fundraising news),
  "product" (direct product feedback about Distill, feature requests, bug reports, user complaints).
  Key distinctions: "piper-dev" is the BUSINESS of events + AI (intersection), "event-tech" is event SOFTWARE/PLATFORMS, "event-general" is the INDUSTRY itself.
  Use null if the content doesn't clearly fit any stream.

Consider the source channel and contributor context when assessing urgency and type.

IMPORTANT: Respond with ONLY a JSON object in this exact format, no markdown or explanation:
{"summary": "...", "type": "...", "themes": ["..."], "urgency": 1, "confidence": 0.9, "is_feedback": true, "stream": "product"}`

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

CROSS-STREAM ANALYSIS:
Each input has a domain stream (general-ai, piper-dev, event-tech, event-general, vc-investment, product) indicating its source domain.
When evidence for a signal spans multiple streams, highlight this as a cross-stream pattern in the signal's reasoning. Cross-stream signals often indicate broader trends. Pay special attention to themes that bridge related sub-verticals (e.g., general-ai + vc-investment for AI funding trends, event-tech + event-general for industry-wide technology shifts, piper-dev + event-general for event business intelligence).

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

  async synthesize(inputs: SynthesisInput[], priorSignals?: PriorSignal[], productContext?: string): Promise<LLMSignal[]> {
    try {
      const inputContext = inputs
        .map(
          (i) =>
            `[${i.id}] (${i.source}/${i.stream ?? 'unknown'}, ${i.type}, urgency:${i.urgency}) ${i.summary} | themes: ${i.themes.join(', ')}${i.notes ? ` | note: ${i.notes}` : ''}`,
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

      const response = await this.client.messages.create({
        model: SYNTHESIZE_MODEL,
        max_tokens: 4096,
        system: SYNTHESIZE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userContent,
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
