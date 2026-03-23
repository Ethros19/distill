import type { RawInput, StructuredInput, SynthesisInput, LLMSignal } from './types'

export interface LLMProvider {
  /** Structure raw feedback into normalized fields */
  structure(input: RawInput): Promise<StructuredInput>

  /** Cluster structured inputs into actionable signals */
  synthesize(inputs: SynthesisInput[]): Promise<LLMSignal[]>
}
