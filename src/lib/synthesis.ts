import { db } from '@/lib/db'
import { inputs, syntheses, signals, settings } from '@/lib/schema'
import { getLLMProvider } from '@/lib/llm/provider-factory'
import type { SynthesisInput, LLMSignal, PriorSignal } from '@/lib/llm/types'
import { and, eq, gte, lt, ne, inArray, desc } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Period calculation
// ---------------------------------------------------------------------------

export function calculatePeriod(now?: Date): { periodStart: Date; periodEnd: Date } {
  const periodEnd = now ?? new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
  return { periodStart, periodEnd }
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type SynthesisResult =
  | { status: 'completed'; synthesisId: string; signalCount: number; inputCount: number }
  | { status: 'skipped'; reason: string; inputCount: 0 }

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runSynthesis(options?: {
  trigger?: string
  now?: Date
}): Promise<SynthesisResult> {
  const { periodStart, periodEnd } = calculatePeriod(options?.now)

  // Query processed inputs within the period
  const inputRows = await db
    .select()
    .from(inputs)
    .where(
      and(
        gte(inputs.createdAt, periodStart),
        lt(inputs.createdAt, periodEnd),
        eq(inputs.status, 'processed'),
        eq(inputs.isFeedback, true),
      ),
    )

  // Zero-input guard: skip synthesis entirely
  if (inputRows.length === 0) {
    return { status: 'skipped', reason: 'no inputs in period', inputCount: 0 }
  }

  // Map DB rows to SynthesisInput format for LLM provider
  const synthesisInputs: SynthesisInput[] = inputRows.map((row) => ({
    id: row.id,
    summary: row.summary ?? '',
    type: row.type ?? 'observation',
    themes: row.themes ?? [],
    urgency: row.urgency ?? 1,
    source: row.source,
    notes: row.notes ?? undefined,
    stream: row.stream ?? undefined,
  }))

  // Query non-feedback industry inputs from all business-relevant streams
  // general-ai has high volume (~1000+/week) so we query it separately with a tighter limit
  const coreStreams = ['business-dev', 'event-tech', 'event-general', 'vc-investment'] as const
  const [coreRows, aiRows] = await Promise.all([
    db
      .select()
      .from(inputs)
      .where(
        and(
          gte(inputs.createdAt, periodStart),
          lt(inputs.createdAt, periodEnd),
          eq(inputs.status, 'processed'),
          eq(inputs.isFeedback, false),
          inArray(inputs.stream, [...coreStreams]),
        ),
      )
      .orderBy(desc(inputs.urgency), desc(inputs.createdAt))
      .limit(50),
    db
      .select()
      .from(inputs)
      .where(
        and(
          gte(inputs.createdAt, periodStart),
          lt(inputs.createdAt, periodEnd),
          eq(inputs.status, 'processed'),
          eq(inputs.isFeedback, false),
          eq(inputs.stream, 'general-ai'),
        ),
      )
      .orderBy(desc(inputs.urgency), desc(inputs.createdAt))
      .limit(20),
  ])
  const industryRows = [...coreRows, ...aiRows]

  const industryInputs: SynthesisInput[] = industryRows.map((row) => ({
    id: row.id,
    summary: row.summary ?? '',
    type: row.type ?? 'observation',
    themes: row.themes ?? [],
    urgency: row.urgency ?? 1,
    source: row.source,
    notes: row.notes ?? undefined,
    stream: row.stream ?? undefined,
  }))

  // Query prior signals that have been triaged (not 'new') for cross-synthesis dedup
  const priorSignalRows = await db
    .select({
      statement: signals.statement,
      status: signals.status,
      themes: signals.themes,
      strength: signals.strength,
      notes: signals.notes,
    })
    .from(signals)
    .where(ne(signals.status, 'new'))

  const priorSignals: PriorSignal[] = priorSignalRows.map((row) => ({
    statement: row.statement,
    status: row.status,
    themes: row.themes ?? [],
    strength: row.strength,
    notes: row.notes ?? undefined,
  }))

  // Load product context for feature-aware synthesis
  const [ctxRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'product_context'))
  const productContext = ctxRow?.value || undefined

  // Collect industry input IDs for traceability
  const industryInputIds = industryInputs.map(i => i.id)

  // Call LLM provider — pass industry inputs as 4th arg (empty array is fine, not a skip condition)
  const llmSignals: LLMSignal[] = await getLLMProvider().synthesize(synthesisInputs, priorSignals, productContext, industryInputs)

  // Insert synthesis record
  const [synthesisRecord] = await db
    .insert(syntheses)
    .values({
      periodStart,
      periodEnd,
      inputCount: inputRows.length,
      signalCount: llmSignals.length,
      trigger: options?.trigger ?? 'cron',
      industryInputIds,
    })
    .returning()

  // Insert signal records (batch)
  if (llmSignals.length > 0) {
    await db.insert(signals).values(
      llmSignals.map((signal) => ({
        synthesisId: synthesisRecord.id,
        statement: signal.statement,
        reasoning: signal.reasoning,
        evidence: signal.evidence,
        suggestedAction: signal.suggested_action,
        themes: signal.themes,
        strength: signal.strength,
      })),
    )
  }

  // Generate synthesis narrative (supplementary — failures do not break the run)
  try {
    const narrative = await getLLMProvider().generateNarrative(llmSignals, industryInputs, productContext)
    await db
      .update(syntheses)
      .set({ digestMarkdown: narrative })
      .where(eq(syntheses.id, synthesisRecord.id))
    console.log(`[synthesis] narrative generated: ${narrative.length} chars`)
  } catch (err) {
    console.error('[synthesis] narrative generation failed:', err instanceof Error ? err.message : err)
  }

  return {
    status: 'completed',
    synthesisId: synthesisRecord.id,
    signalCount: llmSignals.length,
    inputCount: inputRows.length,
  }
}
