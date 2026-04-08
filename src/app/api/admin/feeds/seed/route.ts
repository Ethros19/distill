import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { feedSources } from '@/lib/schema'
import { recommendedFeeds } from '@/lib/recommended-feeds'

export async function POST() {
  try {
    let seeded = 0
    let skipped = 0

    for (const feed of recommendedFeeds) {
      const result = await db
        .insert(feedSources)
        .values({
          name: feed.name,
          url: feed.url,
          category: feed.category,
          enabled: true,
        })
        .onConflictDoNothing({ target: feedSources.url })
        .returning({ id: feedSources.id })

      if (result.length > 0) {
        seeded++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      seeded,
      skipped,
      total: recommendedFeeds.length,
    })
  } catch (error) {
    console.error('Seed feeds error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
