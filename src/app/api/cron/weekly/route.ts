import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signals as signalsTable, syntheses } from '@/lib/schema'
import { runSynthesis } from '@/lib/synthesis'
import { renderDigest, digestToHtml } from '@/lib/digest'
import { sendDigestEmail } from '@/lib/email'
import { pollAllDueFeeds } from '@/lib/feed-poller'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Poll all enabled feeds before synthesis so we have the latest articles
    const feedResult = await pollAllDueFeeds()
    console.log(`Feed poll: ${feedResult.newItems} new items from ${feedResult.feedsPolled} feeds`)

    const result = await runSynthesis({ trigger: 'cron' })

    if (result.status === 'skipped') {
      return NextResponse.json({
        status: 'skipped',
        reason: result.reason,
        inputCount: 0,
        signalCount: 0,
        digestSent: false,
      })
    }

    // Query full signal records for digest rendering
    const signalRows = await db
      .select()
      .from(signalsTable)
      .where(eq(signalsTable.synthesisId, result.synthesisId))

    // Map DB signal rows to LLMSignal format for renderDigest
    const llmSignals = signalRows.map((row) => ({
      statement: row.statement,
      reasoning: row.reasoning,
      evidence: row.evidence,
      suggested_action: row.suggestedAction ?? '',
      themes: row.themes ?? [],
      strength: row.strength,
    }))

    // Calculate period from synthesis record dates
    const [synthesisRecord] = await db
      .select()
      .from(syntheses)
      .where(eq(syntheses.id, result.synthesisId))

    const markdown = renderDigest(
      llmSignals,
      synthesisRecord.periodStart,
      synthesisRecord.periodEnd,
      result.inputCount,
    )

    const html = digestToHtml(markdown)

    // Store digest markdown in synthesis record
    await db
      .update(syntheses)
      .set({ digestMarkdown: markdown })
      .where(eq(syntheses.id, result.synthesisId))

    const emailResult = await sendDigestEmail({
      markdown,
      html,
      periodStart: synthesisRecord.periodStart,
      periodEnd: synthesisRecord.periodEnd,
      signalCount: result.signalCount,
    })

    return NextResponse.json({
      status: 'completed',
      synthesisId: result.synthesisId,
      inputCount: result.inputCount,
      signalCount: result.signalCount,
      digestSent: emailResult.sent,
      recipients: emailResult.recipients,
      blobUrl: emailResult.blobUrl,
    })
  } catch (error) {
    console.error('Weekly cron failed:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
