import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { and, count, desc, eq, gte, lt } from 'drizzle-orm'
import Link from 'next/link'
import { formatTimeAgo, statusBadge } from './format-utils'

export async function InputsFeed({ since, until }: { since?: Date; until?: Date }) {
  const conditions = []
  if (since) conditions.push(gte(inputs.createdAt, since))
  if (until) conditions.push(lt(inputs.createdAt, until))
  const dateCondition = conditions.length > 0 ? and(...conditions) : undefined

  const [recentInputs, [{ value: totalCount }], [{ value: unprocessedCount }]] =
    await Promise.all([
      db
        .select()
        .from(inputs)
        .where(dateCondition)
        .orderBy(desc(inputs.createdAt))
        .limit(5),
      db.select({ value: count() }).from(inputs).where(dateCondition),
      db
        .select({ value: count() })
        .from(inputs)
        .where(dateCondition ? and(eq(inputs.status, 'unprocessed'), dateCondition) : eq(inputs.status, 'unprocessed')),
    ])

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
          {since ? 'Inputs' : 'Recent Inputs'}
          {totalCount > 0 && (
            <span className="ml-2 normal-case tracking-normal text-muted">
              ({totalCount}{since ? '' : ' total'}{unprocessedCount > 0 && unprocessedCount !== totalCount ? `, ${unprocessedCount} unprocessed` : ''})
            </span>
          )}
        </h3>
      </div>
      {recentInputs.length > 0 ? (
        <ul className="mt-4 divide-y divide-edge-dim">
          {recentInputs.map((input) => (
            <li key={input.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {input.summary || input.rawContent.slice(0, 120)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                    <span>{input.source}</span>
                    <span>&middot;</span>
                    <span>{input.contributor}</span>
                    <span>&middot;</span>
                    <span>{formatTimeAgo(input.createdAt)}</span>
                  </div>
                  {input.themes && input.themes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {input.themes.map((theme) => (
                        <span
                          key={theme}
                          className="rounded-full bg-panel-alt px-2 py-0.5 text-[10px] font-medium text-dim"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(input.status)}`}
                >
                  {input.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm italic text-muted">No inputs yet.</p>
      )}
      <div className="mt-4 border-t border-edge-dim pt-3">
        <Link
          href="/dashboard/inputs"
          className="text-xs font-medium text-accent transition-colors hover:text-ink"
        >
          View all inputs &rarr;
        </Link>
      </div>
    </div>
  )
}
