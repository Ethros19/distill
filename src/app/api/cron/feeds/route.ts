import { NextRequest, NextResponse } from 'next/server'
import { pollAllDueFeeds } from '@/lib/feed-poller'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await pollAllDueFeeds()

    return NextResponse.json({
      feedsPolled: summary.feedsPolled,
      newItems: summary.newItems,
      errors: summary.errors,
    })
  } catch (error) {
    console.error('Feed cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
