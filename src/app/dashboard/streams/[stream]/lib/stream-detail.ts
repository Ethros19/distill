import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { eq, desc, sql, and, count } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeeklyVolume = { week: string; count: number }
export type ThemeFrequency = { theme: string; freq: number }
export type RecentArticle = {
  id: string
  summary: string | null
  createdAt: Date
  feedUrl: string | null
  urgency: number | null
}

export type StreamDetail = {
  weeklyVolume: WeeklyVolume[]
  themes: ThemeFrequency[]
  recentArticles: RecentArticle[]
  totalCount: number
}

// ---------------------------------------------------------------------------
// getStreamDetail — fetches single-stream data (volume, themes, articles)
// ---------------------------------------------------------------------------

export async function getStreamDetail(stream: string): Promise<StreamDetail> {
  const [volumeRows, themeRows, recentArticles] = await Promise.all([
    // Weekly volume: bucket by week
    db
      .select({
        week: sql<string>`date_trunc('week', ${inputs.createdAt})::text`,
        count: count(),
      })
      .from(inputs)
      .where(and(eq(inputs.stream, stream), eq(inputs.isFeedback, false)))
      .groupBy(sql`date_trunc('week', ${inputs.createdAt})`)
      .orderBy(sql`date_trunc('week', ${inputs.createdAt})`),

    // All themes for stream with normalization (lowercase, underscores → spaces)
    db.execute(sql`
      SELECT lower(replace(theme, '_', ' ')) AS theme, count(*)::int AS freq
      FROM (
        SELECT jsonb_array_elements_text(themes) AS theme
        FROM inputs
        WHERE stream = ${stream}
          AND is_feedback = false
          AND themes IS NOT NULL
          AND jsonb_array_length(themes) > 0
      ) t
      GROUP BY lower(replace(theme, '_', ' '))
      ORDER BY freq DESC
      LIMIT 20
    `),

    // Recent articles: top 20 for this stream
    db
      .select({
        id: inputs.id,
        summary: inputs.summary,
        createdAt: inputs.createdAt,
        feedUrl: inputs.feedUrl,
        urgency: inputs.urgency,
      })
      .from(inputs)
      .where(and(eq(inputs.stream, stream), eq(inputs.isFeedback, false)))
      .orderBy(desc(inputs.createdAt))
      .limit(20),
  ])

  const weeklyVolume: WeeklyVolume[] = volumeRows.map((r) => ({
    week: r.week,
    count: r.count,
  }))

  const themes: ThemeFrequency[] = (themeRows.rows as { theme: string; freq: number }[]).map(
    (r) => ({ theme: r.theme, freq: r.freq }),
  )

  const totalCount = weeklyVolume.reduce((sum, w) => sum + w.count, 0)

  return { weeklyVolume, themes, recentArticles, totalCount }
}
