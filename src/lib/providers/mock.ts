import type { LLMProvider } from '../llm/provider'
import type { RawInput, StructuredInput, SynthesisInput, LLMSignal, PriorSignal } from '../llm/types'

export class MockProvider implements LLMProvider {
  async structure(input: RawInput): Promise<StructuredInput> {
    return {
      summary: `Summary of: ${input.content.substring(0, 100)}`,
      type: 'observation',
      themes: ['general-feedback'],
      urgency: 3,
      confidence: 0.8,
    }
  }

  async synthesize(inputs: SynthesisInput[], _priorSignals?: PriorSignal[], _productContext?: string): Promise<LLMSignal[]> {
    return [
      {
        statement: `Pattern detected across ${inputs.length} inputs`,
        reasoning: 'Mock reasoning for testing purposes',
        evidence: inputs.map((i) => i.id),
        suggested_action: 'Review the synthesized inputs manually',
        themes: [...new Set(inputs.flatMap((i) => i.themes))],
        strength: inputs.length,
      },
    ]
  }
}
