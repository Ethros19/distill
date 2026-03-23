import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { structureInput } from '@/lib/structurer'
import { AnthropicProvider } from '@/lib/providers/anthropic'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const unprocessed = await db
      .select()
      .from(inputs)
      .where(eq(inputs.status, 'unprocessed'))
      .limit(50)

    if (unprocessed.length === 0) {
      return NextResponse.json({ processed: 0, failed: 0, total: 0 })
    }

    const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY!)
    const results = { processed: 0, failed: 0, total: unprocessed.length }

    for (const input of unprocessed) {
      try {
        const structured = await structureInput(
          input.rawContent,
          input.source,
          input.contributor,
          provider,
        )

        await db
          .update(inputs)
          .set({
            summary: structured.summary,
            type: structured.type,
            themes: structured.themes,
            urgency: structured.urgency,
            confidence: structured.confidence,
            contentHash: structured.content_hash,
            status: 'processed',
          })
          .where(eq(inputs.id, input.id))

        results.processed++
      } catch (error) {
        console.error(`Cron: failed to structure input ${input.id}:`, error)
        results.failed++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Daily cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
