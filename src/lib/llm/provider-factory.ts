import { AnthropicProvider } from '../providers/anthropic'
import { OpenAIProvider } from '../providers/openai'
import { OllamaProvider } from '../providers/ollama'
import { MockProvider } from '../providers/mock'
import type { LLMProvider } from './provider'

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
