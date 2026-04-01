import { AnthropicProvider } from '../providers/anthropic'
import { OpenAIProvider } from '../providers/openai'
import { OllamaProvider } from '../providers/ollama'
import { MockProvider } from '../providers/mock'
import type { LLMProvider } from './provider'
import { db } from '../db'
import { settings } from '../schema'
import { eq } from 'drizzle-orm'

/**
 * Synchronous provider factory using only env vars.
 * Used in contexts where async DB reads aren't practical.
 */
export function getLLMProvider(): LLMProvider {
  const providerName = process.env.LLM_PROVIDER || 'anthropic'

  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!)
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY!)
    case 'ollama':
      return new OllamaProvider()
    case 'mock':
      return new MockProvider()
    default:
      throw new Error(
        `Unknown LLM provider: ${providerName}. Supported: anthropic, openai, ollama, mock`,
      )
  }
}

/**
 * Async provider factory that checks DB-stored keys first, then env vars.
 * Prefer this in route handlers and server components.
 */
export async function getLLMProviderAsync(): Promise<LLMProvider> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'llm_provider'))
    .then((r) => r[0])

  const dbProvider = rows?.value
  const providerName = dbProvider || process.env.LLM_PROVIDER || 'anthropic'

  switch (providerName) {
    case 'anthropic': {
      const keyRow = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'api_key_anthropic'))
        .then((r) => r[0])
      const apiKey = keyRow?.value || process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('Anthropic API key not configured. Set it in Integrations or as ANTHROPIC_API_KEY env var.')
      return new AnthropicProvider(apiKey)
    }
    case 'openai': {
      const keyRow = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'api_key_openai'))
        .then((r) => r[0])
      const apiKey = keyRow?.value || process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OpenAI API key not configured. Set it in Integrations or as OPENAI_API_KEY env var.')
      return new OpenAIProvider(apiKey)
    }
    case 'ollama': {
      const urlRow = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'ollama_base_url'))
        .then((r) => r[0])
      if (urlRow?.value) {
        process.env.OLLAMA_BASE_URL = urlRow.value
      }
      return new OllamaProvider()
    }
    case 'mock':
      return new MockProvider()
    default:
      throw new Error(
        `Unknown LLM provider: ${providerName}. Supported: anthropic, openai, ollama, mock`,
      )
  }
}
