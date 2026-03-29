import { db } from '@/lib/db'
import { feedSources, inputs } from '@/lib/schema'
import { sql, count } from 'drizzle-orm'
import Link from 'next/link'
import { StreamCoverageGrid } from './stream-coverage-grid'

export async function SourceHealthPanel() {
  // Fetch health counts and intake breakdown in parallel
  const [healthRows, intakeRows] = await Promise.all([
    db
      .select({
        healthy: sql<number>`count(*) filter (where ${feedSources.enabled} = true and ${feedSources.lastError} is null and ${feedSources.lastPolledAt} is not null)`,
        errored: sql<number>`count(*) filter (where ${feedSources.lastError} is not null)`,
        disabled: sql<number>`count(*) filter (where ${feedSources.enabled} = false)`,
        neverPolled: sql<number>`count(*) filter (where ${feedSources.enabled} = true and ${feedSources.lastPolledAt} is null)`,
        total: count(),
      })
      .from(feedSources),
    db
      .select({
        source: inputs.source,
        inputCount: count(),
      })
      .from(inputs)
      .groupBy(inputs.source),
  ])

  const health = healthRows[0]
  const intakeMap: Record<string, number> = {}
  for (const row of intakeRows) {
    intakeMap[row.source] = row.inputCount
  }

  const rssCount = intakeMap['rss'] || 0
  const emailCount = intakeMap['email'] || 0
  const pasteCount = intakeMap['paste'] || 0

  return (
    <div className="rounded-lg border border-edge bg-panel p-4 space-y-4">
      {/* Health summary + Manage Sources link */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Row 1: Health counts */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-sig-low" />
              <span className="text-dim">{health.healthy} healthy</span>
            </span>
            {health.errored > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-sig-high" />
                <span className="text-dim">{health.errored} errored</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-dim">{health.disabled} disabled</span>
            </span>
            {health.neverPolled > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                <span className="text-dim">{health.neverPolled} never polled</span>
              </span>
            )}
          </div>

          {/* Row 2: Intake breakdown */}
          <p className="text-xs text-muted">
            {rssCount.toLocaleString()} from RSS
            {emailCount > 0 && <>, {emailCount.toLocaleString()} from email</>}
            {pasteCount > 0 && <>, {pasteCount.toLocaleString()} from paste</>}
          </p>
        </div>

        <Link
          href="/dashboard/sources"
          className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
        >
          Manage Sources
        </Link>
      </div>

      {/* Stream coverage grid */}
      <StreamCoverageGrid />
    </div>
  )
}
