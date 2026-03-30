import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { sql } from 'drizzle-orm'
import { STREAM_VALUES, STREAM_LABELS, type Stream } from '@/lib/stream-utils'
import { trendDirection } from '../../streams/lib/stream-intelligence'
import type { TrendDirection } from '../../streams/lib/types'

const SYNOPSIS_MODEL = process.env.ANTHROPIC_STRUCTURE_MODEL || 'claude-haiku-4-5-20251001'

// In-memory cache for stream insights (survives across requests in the same serverless instance)
const insightCache = new Map<string, { insight: StreamInsight; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export interface RadarArticle {
  id: string
  summary: string | null
  feedUrl: string | null
  urgency: number | null
  createdAt: Date
}

export interface StreamBrief {
  stream: Stream
  label: string
  trend: TrendDirection
  inputCount: number
  priorCount: number
  topThemes: string[]
  articles: RadarArticle[]
  synopsis: string
  companyImplication: string
}

interface StreamInsight {
  synopsis: string
  companyImplication: string
}

const COMPANY_CONTEXT = 'Company context placeholder.'

/**
 * Generate an AI synopsis and company implication for a stream.
 * Single LLM call returns both. Falls back gracefully on error.
 */
async function generateStreamInsight(
  label: string,
  articles: RadarArticle[],
  themes: string[],
  trend: TrendDirection,
  count: number,
): Promise<StreamInsight> {
  const summaries = articles
    .filter((a) => a.summary)
    .slice(0, 10)
    .map((a, i) => `${i + 1}. ${a.summary}`)

  if (summaries.length === 0) {
    const fallbackSynopsis = themes.length > 0
      ? `No articles yet. Tracked themes include ${themes.join(', ')}.`
      : 'No intelligence data available for this stream yet.'
    return { synopsis: fallbackSynopsis, companyImplication: '' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { synopsis: buildFallbackSynopsis(summaries, themes, trend, count), companyImplication: '' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: SYNOPSIS_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a business intelligence analyst. Given these article summaries from the "${label}" intelligence stream, produce two outputs.

${COMPANY_CONTEXT}

Articles:
${summaries.join('\n')}

Respond with ONLY a JSON object in this exact format, no markdown:
{"synopsis": "2-3 sentence brief synthesizing the overall state of this vertical. Be specific about key developments.", "company_implication": "1-2 sentences on what this means for your company — how these developments affect your company's product strategy, competitive position, or market opportunity."}`,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (textBlock && textBlock.type === 'text') {
      const text = textBlock.text.trim()
      const cleaned = text.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/, '$1').trim()
      const parsed = JSON.parse(cleaned)
      return {
        synopsis: parsed.synopsis || buildFallbackSynopsis(summaries, themes, trend, count),
        companyImplication: parsed.company_implication || '',
      }
    }
  } catch {
    // Fall through to fallback
  }

  return { synopsis: buildFallbackSynopsis(summaries, themes, trend, count), companyImplication: '' }
}

function buildFallbackSynopsis(
  summaries: string[],
  themes: string[],
  trend: TrendDirection,
  count: number,
): string {
  const trendWord = trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Declining' : 'Steady'
  const themeStr = themes.length > 0 ? ` Key themes: ${themes.slice(0, 3).join(', ')}.` : ''
  return `${trendWord} activity with ${count} items tracked.${themeStr} ${summaries.length} articles available.`
}

/**
 * Fetch per-stream intelligence briefs: volume/trend, top themes, top 10 articles,
 * and AI-generated synopses. DB queries run in parallel, then synopses generated
 * in parallel from the results.
 */
export async function getRadarData(windowDays = 14): Promise<StreamBrief[]> {
  const now = Date.now()
  const halfWindow = Math.floor(windowDays / 2)
  const currentStart = new Date(now - halfWindow * 24 * 60 * 60 * 1000)
  const priorStart = new Date(now - windowDays * 24 * 60 * 60 * 1000)
  const since = priorStart

  const [volumeResult, themeResult, articleResult] = await Promise.all([
    db.execute(sql`
      SELECT
        stream,
        sum(CASE WHEN created_at >= ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS current_count,
        sum(CASE WHEN created_at < ${currentStart.toISOString()} THEN 1 ELSE 0 END)::int AS prior_count
      FROM inputs
      WHERE is_feedback = false
        AND created_at >= ${since.toISOString()}
        AND stream IS NOT NULL
      GROUP BY stream
    `),

    db.execute(sql`
      SELECT stream, theme, freq::int AS freq
      FROM (
        SELECT
          stream,
          lower(replace(jsonb_array_elements_text(themes), '_', ' ')) AS theme,
          count(*)::int AS freq,
          rank() OVER (PARTITION BY stream ORDER BY count(*) DESC) AS rn
        FROM inputs
        WHERE is_feedback = false
          AND themes IS NOT NULL
          AND jsonb_array_length(themes) > 0
          AND created_at >= ${since.toISOString()}
        GROUP BY stream, lower(replace(jsonb_array_elements_text(themes), '_', ' '))
      ) ranked
      WHERE rn <= 5
      ORDER BY stream, freq DESC
    `),

    db.execute(sql`
      SELECT id, stream, summary, feed_url, urgency, created_at
      FROM (
        SELECT
          id, stream, summary, feed_url, urgency, created_at,
          row_number() OVER (
            PARTITION BY stream
            ORDER BY urgency DESC NULLS LAST, created_at DESC
          ) AS rn
        FROM inputs
        WHERE is_feedback = false
          AND summary IS NOT NULL
          AND created_at >= ${since.toISOString()}
          AND stream IS NOT NULL
      ) ranked
      WHERE rn <= 10
      ORDER BY stream, rn
    `),
  ])

  // Build lookup maps
  const volumeMap = new Map<string, { current: number; prior: number }>()
  for (const row of (volumeResult as unknown as { rows: Array<{ stream: string; current_count: number; prior_count: number }> }).rows) {
    if (row.stream) volumeMap.set(row.stream, { current: row.current_count, prior: row.prior_count })
  }

  const themeMap = new Map<string, string[]>()
  for (const row of (themeResult as unknown as { rows: Array<{ stream: string; theme: string; freq: number }> }).rows) {
    if (!row.stream) continue
    const arr = themeMap.get(row.stream) ?? []
    arr.push(row.theme)
    themeMap.set(row.stream, arr)
  }

  const articleMap = new Map<string, RadarArticle[]>()
  for (const row of (articleResult as unknown as { rows: Array<{ id: string; stream: string; summary: string | null; feed_url: string | null; urgency: number | null; created_at: string }> }).rows) {
    if (!row.stream) continue
    const arr = articleMap.get(row.stream) ?? []
    arr.push({
      id: row.id,
      summary: row.summary,
      feedUrl: row.feed_url,
      urgency: row.urgency,
      createdAt: new Date(row.created_at),
    })
    articleMap.set(row.stream, arr)
  }

  // Build base briefs (without synopsis)
  const baseBriefs = STREAM_VALUES.map((stream) => {
    const vol = volumeMap.get(stream)
    const current = vol?.current ?? 0
    const prior = vol?.prior ?? 0
    const total = current + prior

    return {
      stream,
      label: STREAM_LABELS[stream],
      trend: (total < 5 ? 'stable' : trendDirection(current, prior)) as TrendDirection,
      inputCount: total,
      priorCount: prior,
      topThemes: themeMap.get(stream) ?? [],
      articles: articleMap.get(stream) ?? [],
    }
  })

  // Generate insights with caching — cache key is stream + article IDs
  const insights = await Promise.all(
    baseBriefs.map((b) => {
      const articleKey = b.articles.map((a) => a.id).sort().join(',')
      const cacheKey = `${b.stream}:${articleKey}`
      const cached = insightCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.insight
      }
      return generateStreamInsight(b.label, b.articles, b.topThemes, b.trend, b.inputCount)
        .then((insight) => {
          insightCache.set(cacheKey, { insight, expiresAt: Date.now() + CACHE_TTL_MS })
          return insight
        })
    }),
  )

  return baseBriefs.map((b, i) => ({
    ...b,
    synopsis: insights[i].synopsis,
    companyImplication: insights[i].companyImplication,
  }))
}
