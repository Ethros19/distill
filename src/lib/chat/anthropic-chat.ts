import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-6'

/**
 * Thrown when chat can't run with the current configuration (wrong provider,
 * missing key). Carries an HTTP status for the route to surface cleanly.
 */
export class ChatUnavailableError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ChatUnavailableError'
    this.status = status
  }
}

async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key))
  return row?.value || undefined
}

/**
 * Resolve the Anthropic client + chat model for the chat endpoint, reusing the
 * same settings-then-env resolution as the LLM provider factory.
 *
 * Chat currently requires the Anthropic provider (streaming + tool use). When
 * OpenAI/Ollama chat adapters are added, branch here on the resolved provider.
 */
export async function getChatClient(): Promise<{ client: Anthropic; model: string }> {
  const provider = (await getSetting('llm_provider')) || process.env.LLM_PROVIDER || 'anthropic'

  if (provider !== 'anthropic') {
    throw new ChatUnavailableError(
      `Chat currently requires the Anthropic provider, but "${provider}" is configured. Switch the provider to Anthropic in Integrations to use chat.`,
      501,
    )
  }

  const apiKey = (await getSetting('api_key_anthropic')) || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ChatUnavailableError(
      'Anthropic API key not configured. Set it in Integrations or as the ANTHROPIC_API_KEY env var.',
      400,
    )
  }

  return { client: new Anthropic({ apiKey }), model: CHAT_MODEL }
}

/**
 * System prompt for the chat assistant. `signalContext` is a compact snapshot of
 * the latest synthesis (see buildSignalContext) so common questions are answered
 * without a tool round-trip; the tools cover everything deeper. `profile` carries
 * the workspace identity so the assistant can reason about the team's positioning.
 */
export function buildSystemPrompt(
  signalContext: string,
  profile: { companyName?: string; productContext?: string } = {},
): string {
  const orgLine = profile.companyName ? ` You are assisting the team at ${profile.companyName}.` : ''
  const positioning = profile.companyName ? `${profile.companyName}'s positioning` : 'the team’s positioning'
  const productBlock = profile.productContext
    ? `\n\nProduct context (what the team is building — use it when reasoning about positioning):\n${profile.productContext}`
    : ''

  return `You are the Distill intelligence assistant. Distill is a signal-intelligence system for product teams: it ingests product feedback and market inputs, then synthesizes them into "signals" and a market narrative.${orgLine}

Work across BOTH of these lenses, and be explicit about which one you are drawing on:

1. INTERNAL PRODUCT SIGNALS — named patterns synthesized from direct product feedback. Each has a statement, reasoning, supporting evidence (input IDs), a strength score (number of supporting inputs), a status (new / acknowledged / in_progress / resolved / dismissed), and a suggested action. Tools: get_signals, get_signal_detail, get_synthesis_summary, get_themes.

2. INDUSTRY INTELLIGENCE — "the distillation": the synthesis narrative plus industry/market inputs (RSS and other non-feedback sources) covering external trends, competitive moves, and market shifts. Tool: get_intelligence_briefing; also search_inputs with feedback="industry".

Routing:
- Questions about industry trends, market shifts, or ${positioning}: lead with the distillation (call get_intelligence_briefing) and relate it to ${positioning}. Do NOT answer these only from internal signals.
- Questions about product pain points, feature gaps, or what to build: use the internal product signals.
- When it adds insight, connect the two — e.g. how an external trend makes an internal signal more urgent, or where market movement validates a pain point.

Grounding:
- Ground every claim in the data via the tools before asserting anything specific. A snapshot of the latest synthesis is provided below for immediate context.
- Never invent signal IDs, statements, evidence, numbers, or market claims. If the data doesn't support an answer, say so plainly.

Style:
- Be concise and specific. Name exact signals and cite their strength and status; attribute market claims to the briefing or industry inputs.
- Use light Markdown: short paragraphs, **bold** for signal/trend names, and bullet lists when enumerating. Lead with the answer, then supporting detail.${productBlock}

<workspace_snapshot>
${signalContext}
</workspace_snapshot>`
}
