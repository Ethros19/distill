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

    // Strip tracking params for cleaner storage, but fetch the original
    const cleanUrl = stripTrackingParams(url)

    if (!URL_REGEX.test(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 },
      )
    }

    // Try direct fetch first, fall back to Jina Reader for blocked sites
    let title = ''
    let text = ''

    const direct = await fetchDirect(url)
    if (direct.ok) {
      title = extractTitle(direct.html)
      text = extractText(direct.html)
    }

    // If direct fetch failed or got too little content, try Jina Reader
    if (!text || text.length < 100) {
      const reader = await fetchViaReader(url)
      if (reader.ok) {
        title = reader.title || title
        text = reader.text
      }
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract content. The site may block automated access. Try pasting the article text via "Add Feedback" instead.' },
        { status: 422 },
      )
    }

    // Truncate to a reasonable size
    const truncated = text.slice(0, 8000)
    const content = title
      ? `${title}\n\nSource: ${cleanUrl}\n\n${truncated}`
      : `Source: ${cleanUrl}\n\n${truncated}`

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
        feedUrl: cleanUrl,
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
      { id: inserted.id, title: title || cleanUrl, status: 'unprocessed' },
      { status: 201 },
    )
  } catch (error) {
    console.error('URL intake error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --- Fetch strategies ---

async function fetchDirect(url: string): Promise<{ ok: boolean; html: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Distill/1.0; +https://github.com/Ethros19/distill)',
        Accept: 'text/html, application/xhtml+xml, text/plain',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return { ok: false, html: '' }
    const html = await response.text()
    return { ok: true, html }
  } catch {
    return { ok: false, html: '' }
  }
}

async function fetchViaReader(url: string): Promise<{ ok: boolean; title: string; text: string }> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { ok: false, title: '', text: '' }
    const body = await response.text()

    // Jina returns markdown with Title: and Markdown Content: sections
    const titleMatch = body.match(/^Title:\s*(.+)$/m)
    const title = titleMatch?.[1]?.trim() ?? ''

    // Strip the metadata header, keep the content
    const contentStart = body.indexOf('Markdown Content:')
    const text = contentStart >= 0
      ? body.slice(contentStart + 'Markdown Content:'.length).trim()
      : body.trim()

    // Strip markdown formatting for cleaner input
    const cleaned = text
      .replace(/!\[.*?\]\(.*?\)/g, '') // images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links → text
      .replace(/^#{1,6}\s+/gm, '') // headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italic
      .replace(/^[-*]\s+/gm, '- ') // normalize lists
      .replace(/\n{3,}/g, '\n\n') // collapse blank lines
      .trim()

    return { ok: cleaned.length >= 50, title, text: cleaned }
  } catch {
    return { ok: false, title: '', text: '' }
  }
}

// --- Helpers ---

function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url)
    const tracking = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', '_bhlid', 'ref', 'fbclid', 'gclid']
    for (const param of tracking) {
      u.searchParams.delete(param)
    }
    return u.toString()
  } catch {
    return url
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return ''
  return decodeEntities(match[1]).replace(/\s+/g, ' ').trim()
}

function extractText(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
    || cleaned.match(/<main[\s\S]*?<\/main>/i)
    || cleaned.match(/<div[^>]*(?:class|id)="[^"]*(?:content|article|post|entry|body)[^"]*"[\s\S]*?<\/div>/i)

  if (articleMatch) {
    cleaned = articleMatch[0]
  }

  cleaned = cleaned.replace(/<[^>]+>/g, ' ')
  cleaned = decodeEntities(cleaned)
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
