import { db } from '@/lib/db'
import { syntheses, signals, inputs } from '@/lib/schema'
import { sql, desc, eq, and, gte, lte, inArray } from 'drizzle-orm'
import type {
  SynthesisRecord,
  SynthesisSignal,
  IndustryInput,
  MarketValidation,
  PerStreamSynthesis,
  SynthesisScopeData,
} from './types'

// ---------------------------------------------------------------------------
// Theme normalization — matches existing queryCrossStreamThemes pattern
// ---------------------------------------------------------------------------

function normalizeTheme(theme: string): string {
  return theme.toLowerCase().replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// Core data fetchers
// ---------------------------------------------------------------------------

async function fetchLatestSynthesis(): Promise<SynthesisRecord | null> {
  const rows = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    createdAt: row.createdAt,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    inputCount: row.inputCount,
    signalCount: row.signalCount,
    digestMarkdown: row.digestMarkdown,
    industryInputIds: row.industryInputIds ?? null,
    trigger: row.trigger,
  }
}

async function fetchSignals(synthesisId: string): Promise<SynthesisSignal[]> {
  const rows = await db
    .select()
    .from(signals)
    .where(eq(signals.synthesisId, synthesisId))
    .orderBy(desc(signals.strength))

  return rows.map((row) => ({
    id: row.id,
    statement: row.statement,
    reasoning: row.reasoning,
    themes: (row.themes as string[] | null) ?? [],
    strength: row.strength,
    status: row.status,
    suggestedAction: row.suggestedAction ?? '',
    evidenceInputIds: (row.evidence as string[] | null) ?? [],
  }))
}

/**
 * Fetch industry inputs that were in context during synthesis.
 * Primary: use industry_input_ids from the synthesis record (exact).
 * Fallback: period-window approximation when IDs are unavailable.
 */
async function fetchIndustryInputs(
  synthesis: SynthesisRecord,
): Promise<IndustryInput[]> {
  let rows: (typeof inputs.$inferSelect)[]

  if (synthesis.industryInputIds && synthesis.industryInputIds.length > 0) {
    // Exact: query by stored IDs
    rows = await db
      .select()
      .from(inputs)
      .where(inArray(inputs.id, synthesis.industryInputIds))
  } else {
    // Fallback: period-window approximation
    rows = await db
      .select()
      .from(inputs)
      .where(
        and(
          eq(inputs.isFeedback, false),
          gte(inputs.createdAt, synthesis.periodStart),
          lte(inputs.createdAt, synthesis.periodEnd),
        ),
      )
      .orderBy(desc(inputs.urgency), desc(inputs.createdAt))
      .limit(70)
  }

  return rows.map((row) => ({
    id: row.id,
    summary: row.summary ?? '',
    stream: row.stream,
    themes: (row.themes as string[] | null) ?? [],
    urgency: row.urgency ?? 0,
    source: row.source,
    publishedAt: row.publishedAt,
    feedUrl: row.feedUrl,
  }))
}

// ---------------------------------------------------------------------------
// Market validation — signal themes intersected with cross-stream industry
// ---------------------------------------------------------------------------

function computeMarketValidations(
  signalList: SynthesisSignal[],
  industryInputList: IndustryInput[],
): MarketValidation[] {
  // Build map: normalized theme → set of streams
  const themeToStreams = new Map<string, Set<string>>()
  for (const input of industryInputList) {
    if (!input.stream) continue
    for (const theme of input.themes) {
      const normalized = normalizeTheme(theme)
      let streams = themeToStreams.get(normalized)
      if (!streams) {
        streams = new Set()
        themeToStreams.set(normalized, streams)
      }
      streams.add(input.stream)
    }
  }

  // Filter to cross-stream themes (2+ distinct streams)
  const crossStreamThemes = new Map<string, Set<string>>()
  for (const [theme, streams] of themeToStreams) {
    if (streams.size >= 2) {
      crossStreamThemes.set(theme, streams)
    }
  }

  // For each signal, find intersecting cross-stream themes
  const validations: MarketValidation[] = []
  for (const signal of signalList) {
    const validatingThemes: string[] = []
    const matchingStreamSet = new Set<string>()

    for (const theme of signal.themes) {
      const normalized = normalizeTheme(theme)
      const streams = crossStreamThemes.get(normalized)
      if (streams) {
        validatingThemes.push(normalized)
        for (const s of streams) matchingStreamSet.add(s)
      }
    }

    if (validatingThemes.length > 0) {
      validations.push({
        signalId: signal.id,
        signalStatement: signal.statement,
        signalStrength: signal.strength,
        validatingThemes,
        industryStreamCount: matchingStreamSet.size,
        matchingStreams: Array.from(matchingStreamSet).sort(),
      })
    }
  }

  // Sort by validating theme count desc, then strength desc
  validations.sort((a, b) =>
    b.validatingThemes.length - a.validatingThemes.length ||
    b.signalStrength - a.signalStrength,
  )

  return validations
}

// ---------------------------------------------------------------------------
// Cross-stream themes with signal counts
// ---------------------------------------------------------------------------

function computeCrossStreamThemesWithSignals(
  industryInputList: IndustryInput[],
  signalList: SynthesisSignal[],
): SynthesisScopeData['crossStreamThemes'] {
  // Build map: normalized theme → set of streams
  const themeToStreams = new Map<string, Set<string>>()
  for (const input of industryInputList) {
    if (!input.stream) continue
    for (const theme of input.themes) {
      const normalized = normalizeTheme(theme)
      let streams = themeToStreams.get(normalized)
      if (!streams) {
        streams = new Set()
        themeToStreams.set(normalized, streams)
      }
      streams.add(input.stream)
    }
  }

  // Build signal theme set for intersection counting
  const signalThemeSet = new Set<string>()
  for (const signal of signalList) {
    for (const theme of signal.themes) {
      signalThemeSet.add(normalizeTheme(theme))
    }
  }

  // Filter to cross-stream themes and count signal intersections
  const results: SynthesisScopeData['crossStreamThemes'] = []
  for (const [theme, streams] of themeToStreams) {
    if (streams.size >= 2) {
      // Count signals whose themes include this cross-stream theme
      let signalCount = 0
      for (const signal of signalList) {
        const normalizedSignalThemes = signal.themes.map(normalizeTheme)
        if (normalizedSignalThemes.includes(theme)) {
          signalCount++
        }
      }

      results.push({
        theme,
        streamCount: streams.size,
        streams: Array.from(streams).sort(),
        signalCount,
      })
    }
  }

  // Sort by signal count desc, then stream count desc
  results.sort((a, b) =>
    b.signalCount - a.signalCount ||
    b.streamCount - a.streamCount,
  )

  return results
}

// ---------------------------------------------------------------------------
// Per-stream synthesis mapping
// ---------------------------------------------------------------------------

function computePerStreamSynthesis(
  industryInputList: IndustryInput[],
  signalList: SynthesisSignal[],
): PerStreamSynthesis[] {
  // Group industry inputs by stream
  const streamInputs = new Map<string, IndustryInput[]>()
  for (const input of industryInputList) {
    if (!input.stream) continue
    let list = streamInputs.get(input.stream)
    if (!list) {
      list = []
      streamInputs.set(input.stream, list)
    }
    list.push(input)
  }

  const results: PerStreamSynthesis[] = []

  for (const [stream, inputsForStream] of streamInputs) {
    // Build normalized theme set for this stream's industry inputs
    const streamThemeSet = new Set<string>()
    const themeFreq = new Map<string, number>()
    for (const input of inputsForStream) {
      for (const theme of input.themes) {
        const normalized = normalizeTheme(theme)
        streamThemeSet.add(normalized)
        themeFreq.set(normalized, (themeFreq.get(normalized) ?? 0) + 1)
      }
    }

    // Find signals whose themes intersect with this stream's industry themes
    const connectedSignals: SynthesisSignal[] = []
    for (const signal of signalList) {
      const hasIntersection = signal.themes.some((t) =>
        streamThemeSet.has(normalizeTheme(t)),
      )
      if (hasIntersection) {
        connectedSignals.push(signal)
      }
    }

    // Top 5 industry inputs by urgency
    const topIndustryInputs = [...inputsForStream]
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5)

    // Top 5 themes by frequency
    const topThemes = Array.from(themeFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme)

    results.push({
      stream,
      industryInputCount: inputsForStream.length,
      topIndustryInputs,
      connectedSignals,
      topThemes,
    })
  }

  // Sort by connected signal count descending
  results.sort((a, b) => b.connectedSignals.length - a.connectedSignals.length)

  return results
}

// ---------------------------------------------------------------------------
// Unified data fetcher — primary export
// ---------------------------------------------------------------------------

export async function getSynthesisScopeData(): Promise<SynthesisScopeData> {
  const synthesis = await fetchLatestSynthesis()

  if (!synthesis) {
    return {
      synthesis: null,
      signals: [],
      industryInputs: [],
      marketValidations: [],
      perStreamSynthesis: [],
      crossStreamThemes: [],
    }
  }

  // Fetch signals and industry inputs in parallel
  const [signalList, industryInputList] = await Promise.all([
    fetchSignals(synthesis.id),
    fetchIndustryInputs(synthesis),
  ])

  // Compute derived data (in-memory, no additional DB queries)
  const marketValidations = computeMarketValidations(signalList, industryInputList)
  const perStreamSynthesis = computePerStreamSynthesis(industryInputList, signalList)
  const crossStreamThemes = computeCrossStreamThemesWithSignals(industryInputList, signalList)

  return {
    synthesis,
    signals: signalList,
    industryInputs: industryInputList,
    marketValidations,
    perStreamSynthesis,
    crossStreamThemes,
  }
}
