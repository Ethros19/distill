import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { structureInput } from '@/lib/structurer'
import { getLLMProviderAsync } from '@/lib/llm/provider-factory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, source, contributor } = body

    // Validate required fields
    if (!content || !source || !contributor) {
      return NextResponse.json(
        { error: 'Missing required fields: content, source, contributor' },
        { status: 400 },
      )
    }

    // Validate content length
    if (content.length > 10_000) {
      return NextResponse.json(
        { error: 'Content too long (max 10000 chars)' },
        { status: 413 },
      )
    }

    // Compute SHA256 content hash for dedup
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    // Check for duplicate
    const existing = await db.query.inputs.findFirst({
      where: eq(inputs.contentHash, contentHash),
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Duplicate content', existingId: existing.id },
        { status: 409 },
      )
    }

    // Insert unprocessed record
    const result = await db
      .insert(inputs)
      .values({
        rawContent: content,
        source,
        contributor,
        contentHash,
        status: 'unprocessed',
      })
      .returning()

    const inputId = result[0].id

    // Fire async structuring (non-blocking)
    const provider = await getLLMProviderAsync()
    structureInput(content, source, contributor, provider)
      .then(async (structured) => {
        await db
          .update(inputs)
          .set({
            summary: structured.summary,
            type: structured.type,
            themes: structured.themes,
            urgency: structured.urgency,
            confidence: structured.confidence,
            isFeedback: structured.is_feedback,
            stream: structured.stream ?? null,
            status: 'processed',
          })
          .where(eq(inputs.id, inputId))
      })
      .catch((error) => {
        console.error('Structuring failed for input', inputId, error)
      })

    return NextResponse.json({ id: inputId, status: 'unprocessed' }, { status: 201 })
  } catch (error) {
    console.error('Paste intake error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
