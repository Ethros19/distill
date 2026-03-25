export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { eq, desc, count } from 'drizzle-orm'
import Link from 'next/link'
import { InputRow } from '../components/input-row'

const PAGE_SIZE = 20

export default async function InputsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const validStatus = status === 'unprocessed' || status === 'processed' ? status : undefined

  // Fetch inputs with optional status filter
  let query = db
    .select()
    .from(inputs)
    .$dynamic()

  if (validStatus) {
    query = query.where(eq(inputs.status, validStatus))
  }

  const rows = await query
    .orderBy(desc(inputs.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  // Fetch total count with same filter
  let countQuery = db
    .select({ value: count() })
    .from(inputs)
    .$dynamic()

  if (validStatus) {
    countQuery = countQuery.where(eq(inputs.status, validStatus))
  }

  const [{ value: total }] = await countQuery
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Build filter link helpers
  function filterHref(s?: string) {
    const params = new URLSearchParams()
    if (s) params.set('status', s)
    const qs = params.toString()
    return `/dashboard/inputs${qs ? `?${qs}` : ''}`
  }

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (validStatus) params.set('status', validStatus)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/dashboard/inputs${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { label: 'All', value: undefined },
    { label: 'Unprocessed', value: 'unprocessed' },
    { label: 'Processed', value: 'processed' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl tracking-tight text-ink">
            Inputs
          </h2>
          <span className="text-sm text-muted">
            {total} {total === 1 ? 'input' : 'inputs'}
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-panel-alt p-1">
        {tabs.map((tab) => {
          const active = validStatus === tab.value
          return (
            <Link
              key={tab.label}
              href={filterHref(tab.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-panel text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Input list */}
      {rows.length > 0 ? (
        <div className="rounded-xl border border-edge bg-panel p-5">
          <ul className="divide-y divide-edge-dim">
            {rows.map((input) => (
              <InputRow key={input.id} input={input} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm italic text-muted">
            {validStatus
              ? `No ${validStatus} inputs found.`
              : 'No inputs found. Add feedback to get started.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {pageNum > 1 ? (
            <Link
              href={pageHref(pageNum - 1)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
            >
              &larr; Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim opacity-40">
              &larr; Previous
            </span>
          )}

          <span className="text-xs text-muted">
            Page {pageNum} of {totalPages}
          </span>

          {pageNum < totalPages ? (
            <Link
              href={pageHref(pageNum + 1)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-panel-alt hover:text-ink"
            >
              Next &rarr;
            </Link>
          ) : (
            <span className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-dim opacity-40">
              Next &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  )
}
