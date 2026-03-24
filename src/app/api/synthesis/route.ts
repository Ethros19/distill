import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syntheses, signals } from '@/lib/schema'
import { runSynthesis } from '@/lib/synthesis'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const [latest] = await db
    .select()
    .from(syntheses)
    .orderBy(desc(syntheses.createdAt))
    .limit(1)

  if (!latest) {
    return NextResponse.json({ synthesis: null, signals: [] })
  }

  const signalRows = await db
    .select()
    .from(signals)
    .where(eq(signals.synthesisId, latest.id))
    .orderBy(desc(signals.strength))

  return NextResponse.json({ synthesis: latest, signals: signalRows })
}

export async function POST() {
  try {
    const result = await runSynthesis({ trigger: 'manual' })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Manual synthesis failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Synthesis failed' },
      { status: 500 },
    )
  }
}
