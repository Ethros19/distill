export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly operation: 'structure' | 'synthesize' | 'generateNarrative',
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export class LLMRateLimitError extends LLMError {
  retryAfter?: number

  constructor(provider: string, operation: 'structure' | 'synthesize' | 'generateNarrative', retryAfter?: number) {
    super(`Rate limited by ${provider}`, provider, operation)
    this.name = 'LLMRateLimitError'
    this.retryAfter = retryAfter
  }
}
