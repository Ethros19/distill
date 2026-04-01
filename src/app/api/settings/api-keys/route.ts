import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_KEYS = [
  'llm_provider',
  'api_key_anthropic',
  'api_key_openai',
  'ollama_base_url',
  'api_key_linear',
  'linear_team_id',
] as const

function maskKey(value: string): string {
  if (value.length <= 8) return '••••••••'
  return '••••••••' + value.slice(-4)
}

export async function GET() {
  const allSettings = await db.select().from(settings)
  const result: Record<string, string> = {}

  for (const row of allSettings) {
    if (ALLOWED_KEYS.includes(row.key as typeof ALLOWED_KEYS[number])) {
      // Mask actual API keys, but show non-secret values in full
      if (row.key === 'llm_provider') {
        result[row.key] = row.value
      } else if (row.value) {
        result[row.key] = maskKey(row.value)
        result[`${row.key}_set`] = 'true'
      }
    }
  }

  return NextResponse.json(result)
}

export async function PUT(request: NextRequest) {
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: { key: string; value: string }[] = []

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return NextResponse.json(
        { error: `Invalid key: ${key}` },
        { status: 422 },
      )
    }

    // Don't save masked values (user didn't change the field)
    if (typeof value === 'string' && value.startsWith('••••')) {
      continue
    }

    if (typeof value !== 'string') {
      return NextResponse.json(
        { error: `Value for ${key} must be a string` },
        { status: 422 },
      )
    }

    updates.push({ key, value: value.trim() })
  }

  for (const { key, value } of updates) {
    if (value === '') {
      // Empty string = remove the setting
      await db.delete(settings).where(eq(settings.key, key))
    } else {
      await db
        .insert(settings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        })
    }
  }

  return NextResponse.json({ saved: updates.length })
}
