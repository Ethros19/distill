import type { RawInput, StructuredInput, SynthesisInput, LLMSignal, PriorSignal } from './types'

export interface LLMProvider {
  /** Structure raw feedback into normalized fields */
  structure(input: RawInput): Promise<StructuredInput>

  /** Cluster structured inputs into actionable signals */
  synthesize(inputs: SynthesisInput[], priorSignals?: PriorSignal[], productContext?: string, industryInputs?: SynthesisInput[]): Promise<LLMSignal[]>

  /** Generate a synthesis narrative connecting signals to industry context */
  generateNarrative(signals: LLMSignal[], industryContext: SynthesisInput[], productContext?: string): Promise<string>
}
