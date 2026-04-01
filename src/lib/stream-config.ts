import { cache } from 'react'
import { db } from './db'
import { settings } from './schema'
import { eq } from 'drizzle-orm'
import { streams as defaultStreams, type StreamConfig } from '../../distill.config'

export type { StreamConfig }

const SETTINGS_KEY = 'stream_config'

/**
 * Load stream config from the database, falling back to distill.config.ts.
 * Uses React cache() to deduplicate within a single server request.
 */
export const getStreams = cache(async (): Promise<StreamConfig[]> => {
  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
    if (row?.value) {
      const parsed = JSON.parse(row.value)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // DB not available — use defaults
  }
  return defaultStreams
})

/**
 * Save stream config to the database.
 */
export async function saveStreams(streams: StreamConfig[]): Promise<void> {
  const value = JSON.stringify(streams)
  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
}

/**
 * Derive all stream lookup maps from a config array.
 * Use this when you have the streams already loaded.
 */
export function deriveStreamMaps(streams: StreamConfig[]) {
  const values = streams.map((s) => s.id)
  const labels: Record<string, string> = {}
  const hexColors: Record<string, string> = {}
  const descriptions: Record<string, string> = {}

  for (const s of streams) {
    labels[s.id] = s.label
    hexColors[s.id] = s.hex
    descriptions[s.id] = s.description
  }

  return {
    values,
    labels,
    hexColors,
    descriptions,
    pinned: streams.find((s) => s.pinFirst)?.id ?? null,
    highVolume: streams.filter((s) => s.highVolume).map((s) => s.id),
    categoryMap: Object.fromEntries(
      streams.flatMap((s) => (s.categories ?? []).map((cat) => [cat, s.id])),
    ),
  }
}

/** Get hex color from a streams array */
export function hexFromStreams(
  streams: StreamConfig[],
  streamId: string | null | undefined,
): string {
  if (!streamId) return '#888888'
  return streams.find((s) => s.id === streamId)?.hex ?? '#888888'
}
