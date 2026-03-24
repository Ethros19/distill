import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signals } from '@/lib/schema'

export async function GET() {
  const allSignals = await db.select({ themes: signals.themes }).from(signals)

  const counts = new Map<string, number>()
  for (const row of allSignals) {
    if (row.themes) {
      for (const theme of row.themes) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1)
      }
    }
  }

  const themes = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ themes })
}
