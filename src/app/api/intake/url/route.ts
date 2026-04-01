import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { structureInput } from '@/lib/structurer'
import { getLLMProviderAsync } from '@/lib/llm/provider-factory'

const URL_REGEX = /^https?:\/\/.+/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, contributor } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 },
      )
    }

    if (!URL_REGEX.test(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 },
      )
    }

    // Fetch the article
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Distill/1.0 (Signal Intelligence)',
          Accept: 'text/html, application/xhtml+xml, text/plain',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch URL. Check the link is accessible.' },
        { status: 422 },
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `URL returned ${response.status}` },
        { status: 422 },
      )
    }

    const html = await response.text()

    // Extract readable text from HTML
    const title = extractTitle(html)
    const text = extractText(html)

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough content from this URL' },
        { status: 422 },
      )
    }

    // Truncate to a reasonable size
    const truncated = text.slice(0, 8000)
    const content = title
      ? `${title}\n\nSource: ${url}\n\n${truncated}`
      : `Source: ${url}\n\n${truncated}`

    const contentHash = crypto.createHash('sha256').update(content).digest('hex')

    // Dedup
    const existing = await db.query.inputs.findFirst({
      where: eq(inputs.contentHash, contentHash),
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This article has already been added', existingId: existing.id },
        { status: 409 },
      )
    }

    const [inserted] = await db
      .insert(inputs)
      .values({
        rawContent: content,
        source: 'url',
        contributor: contributor || 'dashboard',
        contentHash,
        status: 'unprocessed',
        isFeedback: false,
        feedUrl: url,
      })
      .returning()

    // Async structuring
    const provider = await getLLMProviderAsync()
    structureInput(content, 'url', contributor || 'dashboard', provider)
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
          .where(eq(inputs.id, inserted.id))
      })
      .catch((error) => {
        console.error('Structuring failed for URL input', inserted.id, error)
      })

    return NextResponse.json(
      { id: inserted.id, title: title || url, status: 'unprocessed' },
      { status: 201 },
    )
  } catch (error) {
    console.error('URL intake error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return ''
  return match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractText(html: string): string {
  // Remove script, style, nav, header, footer tags and their content
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  // Try to find the main article content
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
    || cleaned.match(/<main[\s\S]*?<\/main>/i)
    || cleaned.match(/<div[^>]*(?:class|id)="[^"]*(?:content|article|post|entry|body)[^"]*"[\s\S]*?<\/div>/i)

  if (articleMatch) {
    cleaned = articleMatch[0]
  }

  // Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ')

  // Decode common entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}
