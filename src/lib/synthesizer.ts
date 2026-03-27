import type { LLMProvider } from './llm/provider'
import type { SynthesisInput, LLMSignal, PriorSignal } from './llm/types'

export async function synthesizeSignals(
  inputs: SynthesisInput[],
  provider: LLMProvider,
  priorSignals?: PriorSignal[],
  productContext?: string,
): Promise<LLMSignal[]> {
  if (inputs.length === 0) {
    return []
  }

  return provider.synthesize(inputs, priorSignals, productContext)
}
