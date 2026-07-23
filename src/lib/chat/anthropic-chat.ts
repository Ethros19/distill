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
 * without a tool round-trip; the tools cover everything deeper.
 */
export function buildSystemPrompt(signalContext: string): string {
  return `You are the Distill intelligence assistant. Distill is a signal-intelligence system for product teams: it ingests product feedback and market inputs, then synthesizes them into "signals" — named patterns, each with supporting evidence, a strength score, a status, and a suggested action.

Your job is to help the team explore and understand their signals, syntheses, themes, and raw inputs, answering questions grounded strictly in their actual data.

How to work:
- Ground every claim in the data. Use the tools to look up signals, drill into a signal's evidence, aggregate themes, or search raw inputs before asserting anything specific.
- A snapshot of the latest synthesis is provided below so you can answer broad questions immediately. Reach for the tools when the user needs depth: specific signals, the feedback behind a signal, theme breakdowns, or keyword searches.
- Signal "strength" is the number of supporting inputs. "Status" is one of: new, acknowledged, in_progress, resolved, dismissed.
- Never invent signal IDs, statements, evidence, or numbers. If the data doesn't support an answer, say so plainly instead of speculating.

Style:
- Be concise and specific. Name exact signals and cite their strength and status.
- Use light Markdown for readability: short paragraphs, **bold** for signal names or key terms, and bullet lists when enumerating signals or themes.
- Lead with the answer, then supporting detail.

<latest_synthesis_snapshot>
${signalContext}
</latest_synthesis_snapshot>`
}
