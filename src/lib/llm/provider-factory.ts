import { AnthropicProvider } from '../providers/anthropic'
import type { LLMProvider } from './provider'

export function getLLMProvider(): LLMProvider {
  const providerName = process.env.LLM_PROVIDER || 'anthropic'

  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!)
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`)
  }
}
