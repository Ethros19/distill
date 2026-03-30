export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { db } from '@/lib/db'
import { inputs } from '@/lib/schema'
import { eq, desc, count, and, or, ilike, inArray, sql } from 'drizzle-orm'
import Link from 'next/link'
import { InputRow } from '../components/input-row'
import { STREAM_VALUES, STREAM_LABELS } from '@/lib/stream-utils'
import { SourceHealthPanel } from './components/source-health-panel'
import { InputSearch } from './components/input-search'

const PAGE_SIZE = 20

export default async function InputsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; stream?: string; page?: string; q?: string }>
}) {
  const { status, stream, page, q } = await searchParams
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const validStatus = status === 'unprocessed' || status === 'processed' ? status : undefined
  const isInternal = stream === 'internal'
  const validStream = !isInternal && (STREAM_VALUES as readonly string[]).includes(stream ?? '') ? stream : undefined
  const searchQuery = q?.trim() || undefined

  // Fetch inputs and count in parallel
  let dataQuery = db
    .select()
    .from(inputs)
    .$dynamic()

  let countQuery = db
    .select({ value: count() })
    .from(inputs)
    .$dynamic()

  const conditions = []
  if (validStatus) conditions.push(eq(inputs.status, validStatus))
  if (isInternal) conditions.push(inArray(inputs.source, ['email', 'paste']))
  else if (validStream) conditions.push(eq(inputs.stream, validStream))
  if (searchQuery) {
    const pattern = `%${searchQuery}%`
    conditions.push(
      or(
        ilike(inputs.rawContent, pattern),
        ilike(inputs.summary, pattern),
        sql`${inputs.id}::text ILIKE ${pattern}`,
      )!,
    )
  }
  if (conditions.length > 0) {
    const where = conditions.length === 1 ? conditions[0] : and(...conditions)!
    dataQuery = dataQuery.where(where)
    countQuery = countQuery.where(where)
  }

  const [rows, [{ value: total }], [{ value: unprocessedCount }], [{ value: processedCount }]] = await Promise.all([
    dataQuery.orderBy(desc(inputs.createdAt)).limit(PAGE_SIZE).offset(offset),
    countQuery,
    db.select({ value: count() }).from(inputs).where(eq(inputs.status, 'unprocessed')),
    db.select({ value: count() }).from(inputs).where(eq(inputs.status, 'processed')),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const activeStream = isInternal ? 'internal' : validStream

  // Build filter link helpers
  function filterHref(s?: string, st?: string) {
    const params = new URLSearchParams()
    if (s) params.set('status', s)
    if (st) params.set('stream', st)
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    return `/dashboard/inputs${qs ? `?${qs}` : ''}`
  }

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (validStatus) params.set('status', validStatus)
    if (activeStream) params.set('stream', activeStream)
    if (searchQuery) params.set('q', searchQuery)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/dashboard/inputs${qs ? `?${qs}` : ''}`
  }

  const allCount = unprocessedCount + processedCount
  const tabs = [
    { label: 'All', value: undefined, count: allCount },
    { label: 'Unprocessed', value: 'unprocessed' as const, count: unprocessedCount },
    { label: 'Processed', value: 'processed' as const, count: processedCount },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl tracking-tight text-ink">
              Inputs
            </h2>
            <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              Data
            </span>
            <span className="text-sm text-muted">
              {total} {total === 1 ? 'input' : 'inputs'}
            </span>
          </div>
          <p className="mt-1 text-sm text-dim">
            Raw data reference layer
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Source health panel */}
      <Suspense
        fallback={
          <div className="h-[168px] animate-pulse rounded-lg border border-edge bg-panel" />
        }
      >
        <SourceHealthPanel />
      </Suspense>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-panel-alt p-1">
        {tabs.map((tab) => {
          const active = validStatus === tab.value
          return (
            <Link
              key={tab.label}
              href={filterHref(tab.value, activeStream)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-panel text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-muted">({tab.count})</span>
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <InputSearch />

      {/* Stream filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-panel-alt p-1">
        <Link
          href={filterHref(validStatus, undefined)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeStream
              ? 'bg-panel text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          All Streams
        </Link>
        <Link
          href={filterHref(validStatus, 'internal')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            isInternal
              ? 'bg-panel text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          Internal
        </Link>
        {STREAM_VALUES.map((s) => (
          <Link
            key={s}
            href={filterHref(validStatus, s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              validStream === s
                ? 'bg-panel text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {STREAM_LABELS[s]}
          </Link>
        ))}
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
            {validStatus || activeStream || searchQuery
              ? `No inputs found matching the current filters.`
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
