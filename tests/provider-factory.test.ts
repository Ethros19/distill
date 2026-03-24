import { describe, it, expect, vi, afterEach } from 'vitest'
import { getLLMProvider } from '../src/lib/llm/provider-factory'
import { AnthropicProvider } from '../src/lib/providers/anthropic'
import { OpenAIProvider } from '../src/lib/providers/openai'
import { OllamaProvider } from '../src/lib/providers/ollama'
import { MockProvider } from '../src/lib/providers/mock'

// Mock SDK modules with proper class constructors
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {}
    },
  }
})
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor() {}
    },
  }
})

describe('getLLMProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns AnthropicProvider when LLM_PROVIDER is "anthropic"', () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic')
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const provider = getLLMProvider()
    expect(provider).toBeInstanceOf(AnthropicProvider)
  })

  it('returns AnthropicProvider when LLM_PROVIDER is not set (default)', () => {
    vi.stubEnv('LLM_PROVIDER', '')
    delete process.env.LLM_PROVIDER
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const provider = getLLMProvider()
    expect(provider).toBeInstanceOf(AnthropicProvider)
  })

  it('returns OpenAIProvider when LLM_PROVIDER is "openai"', () => {
    vi.stubEnv('LLM_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const provider = getLLMProvider()
    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('returns OllamaProvider when LLM_PROVIDER is "ollama"', () => {
    vi.stubEnv('LLM_PROVIDER', 'ollama')
    const provider = getLLMProvider()
    expect(provider).toBeInstanceOf(OllamaProvider)
  })

  it('returns MockProvider when LLM_PROVIDER is "mock"', () => {
    vi.stubEnv('LLM_PROVIDER', 'mock')
    const provider = getLLMProvider()
    expect(provider).toBeInstanceOf(MockProvider)
  })

  it('throws Error with descriptive message for unknown provider', () => {
    vi.stubEnv('LLM_PROVIDER', 'invalid-provider')
    expect(() => getLLMProvider()).toThrow(
      'Unknown LLM provider: invalid-provider. Supported: anthropic, openai, ollama, mock',
    )
  })
})
