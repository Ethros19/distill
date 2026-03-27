import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signals, syntheses } from '@/lib/schema'
import { runSynthesis } from '@/lib/synthesis'

export async function POST(request: NextRequest) {
  // Verify admin secret
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete all signals first (FK constraint)
    const deletedSignals = await db.delete(signals).returning({ id: signals.id })

    // Delete all syntheses
    const deletedSyntheses = await db.delete(syntheses).returning({ id: syntheses.id })

    return NextResponse.json({
      status: 'cleared',
      deletedSignals: deletedSignals.length,
      deletedSyntheses: deletedSyntheses.length,
    })
  } catch (error) {
    console.error('Failed to clear syntheses:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
