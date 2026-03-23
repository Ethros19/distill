import type { LLMProvider } from './llm/provider'
import type { SynthesisInput, LLMSignal } from './llm/types'

export async function synthesizeSignals(
  inputs: SynthesisInput[],
  provider: LLMProvider,
): Promise<LLMSignal[]> {
  if (inputs.length === 0) {
    return []
  }

  return provider.synthesize(inputs)
}
