import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'processed':
      return 'bg-sig-low/10 text-sig-low'
    case 'unprocessed':
      return 'bg-accent-wash text-accent'
    default:
      return 'bg-panel-alt text-dim'
  }
}

export async function InputsFeed() {
  const recentInputs = await db
    .select()
    .from(inputs)
    .orderBy(desc(inputs.createdAt))
    .limit(5)

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-medium uppercase tracking-wider text-dim">
        Recent Inputs
      </h3>
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
