import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { eq, gte, lte } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ theme: string }> },
) {
  const { theme } = await params
  const decodedTheme = decodeURIComponent(theme)

  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Query all signals (we filter theme containment in JS since JSONB @> requires raw SQL)
  let query = db
    .select({
      id: signals.id,
      synthesisId: signals.synthesisId,
      statement: signals.statement,
      reasoning: signals.reasoning,
      evidence: signals.evidence,
      suggestedAction: signals.suggestedAction,
      themes: signals.themes,
      strength: signals.strength,
      periodStart: syntheses.periodStart,
      periodEnd: syntheses.periodEnd,
    })
    .from(signals)
    .innerJoin(syntheses, eq(signals.synthesisId, syntheses.id))
    .$dynamic()

  if (from) {
    query = query.where(gte(syntheses.periodEnd, new Date(from)))
  }
  if (to) {
    query = query.where(lte(syntheses.periodEnd, new Date(to)))
  }

  const rows = await query

  // Filter signals whose themes array contains the requested theme
  const matching = rows.filter(
    (row) => row.themes && row.themes.includes(decodedTheme),
  )

  return NextResponse.json({
    theme: decodedTheme,
    signals: matching,
    totalCount: matching.length,
  })
}
