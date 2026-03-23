import crypto from 'crypto'
import type { LLMProvider } from './llm/provider'
import type { StructuredInput } from './llm/types'
import { StructuredInputSchema } from './llm/types'

export async function structureInput(
  content: string,
  source: string,
  contributor: string,
  provider: LLMProvider,
): Promise<StructuredInput & { content_hash: string }> {
  const structured = await provider.structure({ content, source, contributor })

  // Validate with Zod (belt-and-suspenders — provider should already validate)
  const validated = StructuredInputSchema.parse(structured)

  // Compute content hash for dedup
  const content_hash = crypto.createHash('sha256').update(content).digest('hex')

  return { ...validated, content_hash }
}
