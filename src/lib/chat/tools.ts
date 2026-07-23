import { db } from '@/lib/db'
import { signals, syntheses, inputs, settings } from '@/lib/schema'
import { eq, and, desc, gte, or, ilike, inArray, count } from 'drizzle-orm'

/**
 * Provider-agnostic chat tool.
 *
 * `inputSchema` is a plain JSON Schema object so any provider adapter
 * (Anthropic today; OpenAI/Ollama later) can map it to that provider's
 * tool-definition shape. `execute` runs the read-only DB query and returns
 * a JSON string that gets fed back to the model as the tool result.
 *
 * These mirror the read tools exposed by the MCP server (mcp-server/src/tools),
 * so Claude Desktop and the in-app chat answer from the same query logic.
 */
export interface ChatTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute(input: Record<string, unknown>): Promise<string>
}

// --- input coercion helpers (tool inputs come from the model) ------------------
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

const SIGNAL_STATUS_VALUES = ['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed'] as const
type SignalStatusFilter = (typeof SIGNAL_STATUS_VALUES)[number]

export const chatTools: ChatTool[] = [
  {
    name: 'get_synthesis_summary',
    description:
      'Get the latest synthesis overview: metadata (period, input/signal counts) and the top signals ranked by strength. Optionally include the full digest narrative markdown. Call this first for broad "what happened this cycle" questions.',
    inputSchema: {
      type: 'object',
      properties: {
        include_digest: {
          type: 'boolean',
          description: 'Include the full synthesis digest markdown narrative (default false).',
        },
        top_signals: {
          type: 'integer',
          description: 'Number of top signals to include, 1-20 (default 5).',
        },
      },
    },
    async execute(input) {
      const includeDigest = asBool(input.include_digest, false)
      const topSignals = asInt(input.top_signals, 1, 20, 5)

      const [latest] = await db
        .select()
        .from(syntheses)
        .orderBy(desc(syntheses.createdAt))
        .limit(1)

      if (!latest) {
        return JSON.stringify({ message: 'No syntheses found yet. Run a synthesis from the dashboard first.' })
      }

      const signalRows = await db
        .select()
        .from(signals)
        .where(eq(signals.synthesisId, latest.id))
        .orderBy(desc(signals.strength))
        .limit(topSignals)

      return JSON.stringify({
        synthesis: {
          id: latest.id,
          createdAt: latest.createdAt,
          periodStart: latest.periodStart,
          periodEnd: latest.periodEnd,
          inputCount: latest.inputCount,
          signalCount: latest.signalCount,
          trigger: latest.trigger,
          digestMarkdown: includeDigest ? latest.digestMarkdown : undefined,
        },
        topSignals: signalRows.map((s) => ({
          id: s.id,
          statement: s.statement,
          strength: s.strength,
          status: s.status,
          themes: s.themes,
        })),
      })
    },
  },
  {
    name: 'get_intelligence_briefing',
    description:
      'Get the distilled industry & market intelligence — the latest synthesis narrative (the "distillation" briefing about external trends, competitive moves, and market shifts) plus a sample of recent industry inputs (non-feedback market/RSS sources). Use this for questions about industry trends and how they affect positioning, as opposed to internal product signals.',
    inputSchema: {
      type: 'object',
      properties: {
        recent_industry_inputs: {
          type: 'integer',
          description: 'How many recent industry (non-feedback) inputs to include, 0-20 (default 8).',
        },
      },
    },
    async execute(input) {
      const n = asInt(input.recent_industry_inputs, 0, 20, 8)

      const [latest] = await db
        .select()
        .from(syntheses)
        .orderBy(desc(syntheses.createdAt))
        .limit(1)

      const industryRows =
        n > 0
          ? await db
              .select()
              .from(inputs)
              .where(eq(inputs.isFeedback, false))
              .orderBy(desc(inputs.createdAt))
              .limit(n)
          : []

      return JSON.stringify({
        synthesis: latest
          ? {
              id: latest.id,
              createdAt: latest.createdAt,
              periodStart: latest.periodStart,
              periodEnd: latest.periodEnd,
              industryInputCount: latest.industryInputIds?.length ?? 0,
            }
          : null,
        // The synthesis narrative is the distilled market/industry briefing
        // (capped to keep the turn responsive on large digests).
        narrative: latest?.digestMarkdown
          ? latest.digestMarkdown.length > 6000
            ? latest.digestMarkdown.slice(0, 6000) + '…'
            : latest.digestMarkdown
          : null,
        recentIndustryInputs: industryRows.map((row) => ({
          id: row.id,
          source: row.source,
          stream: row.stream,
          summary: row.summary,
          themes: row.themes,
          publishedAt: row.publishedAt,
          createdAt: row.createdAt,
          excerpt:
            row.rawContent.length > 300 ? row.rawContent.slice(0, 300) + '...' : row.rawContent,
        })),
      })
    },
  },
  {
    name: 'get_signals',
    description:
      'List signals from the latest synthesis, optionally filtered by status, theme, or minimum strength. Returns full signal records (statement, reasoning, suggested action, evidence IDs, themes, strength, status).',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: [...SIGNAL_STATUS_VALUES],
          description: 'Filter by signal status.',
        },
        theme: {
          type: 'string',
          description: 'Filter to signals tagged with this theme (case-sensitive).',
        },
        min_strength: {
          type: 'integer',
          description: 'Minimum strength score, 1-10.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of signals to return, 1-100 (default 20).',
        },
      },
    },
    async execute(input) {
      const status = asString(input.status)
      const theme = asString(input.theme)
      const minStrength =
        input.min_strength === undefined ? undefined : asInt(input.min_strength, 1, 10, 1)
      const limit = asInt(input.limit, 1, 100, 20)

      const [latest] = await db
        .select()
        .from(syntheses)
        .orderBy(desc(syntheses.createdAt))
        .limit(1)

      if (!latest) {
        return JSON.stringify({ message: 'No syntheses found yet. Run a synthesis first.' })
      }

      const conditions = [eq(signals.synthesisId, latest.id)]
      if (status && (SIGNAL_STATUS_VALUES as readonly string[]).includes(status)) {
        conditions.push(eq(signals.status, status as SignalStatusFilter))
      }
      if (minStrength !== undefined) {
        conditions.push(gte(signals.strength, minStrength))
      }

      let results = await db
        .select()
        .from(signals)
        .where(and(...conditions))
        .orderBy(desc(signals.strength))
        .limit(limit)

      // Theme containment isn't expressible in Drizzle without raw SQL — filter in JS.
      if (theme) {
        results = results.filter((s) => s.themes?.includes(theme))
      }

      return JSON.stringify({
        synthesisId: latest.id,
        synthesisDate: latest.createdAt,
        signalCount: results.length,
        signals: results,
      })
    },
  },
  {
    name: 'get_signal_detail',
    description:
      'Fetch one signal by its UUID with full details and its resolved evidence inputs (the raw feedback records behind it). Use this to answer "what feedback supports signal X" or to quote source material.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Signal UUID.' },
      },
      required: ['id'],
    },
    async execute(input) {
      const id = asString(input.id)
      if (!id) {
        return JSON.stringify({ error: 'Missing required "id" (signal UUID).' })
      }

      const [signal] = await db.select().from(signals).where(eq(signals.id, id))
      if (!signal) {
        return JSON.stringify({ error: `Signal not found with id: ${id}` })
      }

      const evidenceIds = signal.evidence ?? []
      const evidenceInputs =
        evidenceIds.length > 0
          ? await db.select().from(inputs).where(inArray(inputs.id, evidenceIds))
          : []

      return JSON.stringify({ ...signal, evidenceInputs })
    },
  },
  {
    name: 'get_themes',
    description:
      'Aggregate theme tags across all signals with counts and a per-status breakdown. Use for "what themes are trending" or to see how attention is distributed.',
    inputSchema: {
      type: 'object',
      properties: {
        include_signal_counts: {
          type: 'boolean',
          description: 'Include per-status signal counts for each theme (default true).',
        },
      },
    },
    async execute(input) {
      const includeCounts = asBool(input.include_signal_counts, true)

      const allSignals = await db
        .select({ themes: signals.themes, status: signals.status })
        .from(signals)

      const counts = new Map<string, { total: number; byStatus: Record<string, number> }>()
      for (const row of allSignals) {
        if (!row.themes) continue
        for (const theme of row.themes) {
          const entry = counts.get(theme) ?? { total: 0, byStatus: {} }
          entry.total++
          const status = row.status ?? 'new'
          entry.byStatus[status] = (entry.byStatus[status] ?? 0) + 1
          counts.set(theme, entry)
        }
      }

      const sorted = [...counts.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) =>
          includeCounts ? { name, count: data.total, byStatus: data.byStatus } : { name },
        )

      return JSON.stringify({ themeCount: sorted.length, themes: sorted })
    },
  },
  {
    name: 'search_inputs',
    description:
      'Keyword search across raw inputs (raw content and LLM summaries, case-insensitive). Filter by kind with the "feedback" argument: "feedback" for direct product feedback, "industry" for market/RSS inputs, or "all". Use to find the source material behind a topic or trend.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword to search for.' },
        source: {
          type: 'string',
          description: 'Optional source filter (e.g. "email", "paste", "rss").',
        },
        feedback: {
          type: 'string',
          enum: ['feedback', 'industry', 'all'],
          description:
            'Filter by kind: "feedback" = direct product feedback, "industry" = market/RSS non-feedback inputs, "all" = both (default).',
        },
        limit: {
          type: 'integer',
          description: 'Maximum results to return, 1-50 (default 20).',
        },
      },
      required: ['keyword'],
    },
    async execute(input) {
      const keyword = asString(input.keyword)
      if (!keyword) {
        return JSON.stringify({ error: 'Missing required "keyword".' })
      }
      const source = asString(input.source)
      const feedback = asString(input.feedback)
      const limit = asInt(input.limit, 1, 50, 20)

      // Escape LIKE wildcards so the keyword is matched literally.
      const sanitized = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_')
      const pattern = `%${sanitized}%`

      const conditions = [or(ilike(inputs.rawContent, pattern), ilike(inputs.summary, pattern))]
      if (source) conditions.push(eq(inputs.source, source))
      if (feedback === 'feedback') conditions.push(eq(inputs.isFeedback, true))
      else if (feedback === 'industry') conditions.push(eq(inputs.isFeedback, false))

      const rows = await db
        .select()
        .from(inputs)
        .where(and(...conditions))
        .orderBy(desc(inputs.createdAt))
        .limit(limit)

      const results = rows.map((row) => ({
        id: row.id,
        source: row.source,
        contributor: row.contributor,
        isFeedback: row.isFeedback,
        stream: row.stream,
        rawContent: row.rawContent.length > 500 ? row.rawContent.slice(0, 500) + '...' : row.rawContent,
        summary: row.summary,
        type: row.type,
        themes: row.themes,
        urgency: row.urgency,
        createdAt: row.createdAt,
      }))

      return JSON.stringify({ count: results.length, keyword, results })
    },
  },
]

const toolsByName = new Map(chatTools.map((t) => [t.name, t]))

/**
 * Run a chat tool by name. Mirrors the MCP tools' error convention: never
 * throws for a failed query — returns an error string so the model can recover.
 */
export async function executeChatTool(name: string, input: unknown): Promise<string> {
  const tool = toolsByName.get(name)
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
  try {
    const args = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
    return await tool.execute(args)
  } catch (error) {
    return JSON.stringify({
      error: `Error running ${name}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

/**
 * Compact snapshot of the latest synthesis + its strongest signals, seeded into
 * the system prompt so the assistant can answer common questions without a tool
 * round-trip. Deeper questions still go through the tools above.
 */
export async function buildSignalContext(): Promise<string> {
  const [latest] = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  const [industry] = await db
    .select({ value: count() })
    .from(inputs)
    .where(eq(inputs.isFeedback, false))
  const industryCount = industry?.value ?? 0

  if (!latest) {
    const base = 'No synthesis has been run yet, so there are no distilled signals to reference.'
    return industryCount > 0
      ? `${base} ${industryCount} industry/market input(s) have been captured — use get_intelligence_briefing or search_inputs(feedback="industry") to explore them.`
      : `${base} Encourage the user to add feedback and run a synthesis from the dashboard.`
  }

  const topSignals = await db
    .select({
      id: signals.id,
      statement: signals.statement,
      strength: signals.strength,
      status: signals.status,
      themes: signals.themes,
    })
    .from(signals)
    .where(eq(signals.synthesisId, latest.id))
    .orderBy(desc(signals.strength))
    .limit(8)

  const header = `Latest synthesis: ${new Date(latest.createdAt).toISOString().slice(0, 10)} — ${latest.inputCount} input(s), ${latest.signalCount} internal signal(s) (trigger: ${latest.trigger}); ${industryCount} industry/market input(s) captured overall.`

  const internalSection =
    topSignals.length > 0
      ? `INTERNAL PRODUCT SIGNALS (strongest first):\n${topSignals
          .map(
            (s) =>
              `- [${s.id}] "${s.statement}" (strength ${s.strength}, status ${s.status}${
                s.themes?.length ? `, themes: ${s.themes.join(', ')}` : ''
              })`,
          )
          .join('\n')}`
      : 'INTERNAL PRODUCT SIGNALS: none detected in this synthesis.'

  const narrative = latest.digestMarkdown?.trim()
  const distillSection = narrative
    ? `INDUSTRY INTELLIGENCE / DISTILLATION (synthesis narrative — external trends & market context; call get_intelligence_briefing for the full briefing):\n${
        narrative.length > 700 ? narrative.slice(0, 700) + '…' : narrative
      }`
    : 'INDUSTRY INTELLIGENCE / DISTILLATION: no narrative for this synthesis yet — use get_intelligence_briefing or search_inputs(feedback="industry") to explore market inputs.'

  return `${header}\n\n${distillSection}\n\n${internalSection}`
}

/**
 * Workspace identity from settings — used to personalize the assistant's
 * framing (whose positioning to reason about) without hardcoding any tenant.
 */
export async function getWorkspaceProfile(): Promise<{ companyName?: string; productContext?: string }> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ['company_name', 'product_context']))
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    companyName: map.company_name?.trim() || undefined,
    productContext: map.product_context?.trim() || undefined,
  }
}
