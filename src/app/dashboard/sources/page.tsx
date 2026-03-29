export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { feedSources, inputs } from '@/lib/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { SourcesClient } from './components/SourcesClient'

export default async function SourcesPage() {
  const feeds = await db
    .select({
      id: feedSources.id,
      createdAt: feedSources.createdAt,
      name: feedSources.name,
      url: feedSources.url,
      category: feedSources.category,
      pollingInterval: feedSources.pollingInterval,
      enabled: feedSources.enabled,
      lastPolledAt: feedSources.lastPolledAt,
      lastError: feedSources.lastError,
      inputCount: sql<number>`count(${inputs.id})::int`,
    })
    .from(feedSources)
    .leftJoin(inputs, eq(inputs.feedSourceId, feedSources.id))
    .groupBy(feedSources.id)
    .orderBy(desc(feedSources.createdAt))

  return (
    <div className="space-y-6">
      <SourcesClient feeds={feeds} />
    </div>
  )
}
