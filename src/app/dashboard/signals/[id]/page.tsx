export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { signals, inputs } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { signalStatusBadge, signalStatusLabel, streamBadge, streamLabel } from '../../components/format-utils'
import { strengthColor } from '../../components/signal-card'
import { StatusControls } from './components/status-controls'
import { LinearPushButton } from './components/linear-push-button'
import { SignalNotes } from './components/signal-notes'
import { isLinearConfigured } from '@/lib/linear'
import type { Metadata } from 'next'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function strengthBadge(strength: number): string {
  if (strength >= 5) return 'bg-sig-high/10 text-sig-high'
  if (strength >= 3) return 'bg-sig-mid/10 text-sig-mid'
  return 'bg-sig-low/10 text-sig-low'
}

async function getSignal(id: string) {
  if (!UUID_REGEX.test(id)) return null

  const [signal] = await db
    .select()
    .from(signals)
    .where(eq(signals.id, id))

  return signal ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const signal = await getSignal(id)
  if (!signal) return { title: 'Signal Not Found | Distill' }
  return { title: `${signal.statement} | Distill` }
}

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const signal = await getSignal(id)
  if (!signal) notFound()

  const linearConfigured = isLinearConfigured()

  // Resolve evidence inputs
  const evidenceIds = signal.evidence ?? []
  const evidenceInputs =
    evidenceIds.length > 0
      ? await db
          .select()
          .from(inputs)
          .where(inArray(inputs.id, evidenceIds))
      : []

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-accent"
      >
        &larr; Back
      </Link>

      {/* Signal header */}
      <div className="animate-fade-up">
        <div
          className={`rounded-xl border border-edge border-l-[3px] bg-panel p-6 ${strengthColor(signal.strength)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-xl leading-snug text-ink">
              {signal.statement}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${signalStatusBadge(signal.status)}`}
              >
                {signalStatusLabel(signal.status)}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold ${strengthBadge(signal.strength)}`}
              >
                {signal.strength}
              </span>
            </div>
          </div>

          {/* Status controls */}
          <div className="mt-4">
            <StatusControls
              signalId={signal.id}
              currentStatus={signal.status}
            />
          </div>

          {/* Linear integration */}
          {linearConfigured && (
            <div className="mt-3 border-t border-edge pt-3">
              <LinearPushButton
                signalId={signal.id}
                existingUrl={signal.linearIssueUrl}
              />
            </div>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <div
        className="animate-fade-up space-y-2"
        style={{ animationDelay: '80ms' }}
      >
        <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
          Reasoning
        </h2>
        <p className="text-sm leading-relaxed text-dim">{signal.reasoning}</p>
      </div>

      {/* Suggested action */}
      {signal.suggestedAction && (
        <div
          className="animate-fade-up space-y-2"
          style={{ animationDelay: '140ms' }}
        >
          <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
            Suggested Action
          </h2>
          <div className="flex gap-2 text-sm text-accent">
            <span className="shrink-0">&rarr;</span>
            <span>{signal.suggestedAction}</span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div
        className="animate-fade-up space-y-2"
        style={{ animationDelay: '200ms' }}
      >
        <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
          Notes
        </h2>
        <SignalNotes signalId={signal.id} initialNotes={signal.notes} />
      </div>

      {/* Themes */}
      {signal.themes && signal.themes.length > 0 && (
        <div
          className="animate-fade-up space-y-2"
          style={{ animationDelay: '260ms' }}
        >
          <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
            Themes
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {signal.themes.map((theme) => (
              <Link
                key={theme}
                href={`/dashboard/themes/${encodeURIComponent(theme)}`}
                className="rounded-full bg-panel-alt px-2.5 py-0.5 text-[11px] font-medium text-dim transition-colors hover:text-accent"
              >
                {theme}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      <div
        className="animate-fade-up space-y-3"
        style={{ animationDelay: '320ms' }}
      >
        <h2 className="text-sm font-medium uppercase tracking-wider text-dim">
          Supporting Inputs
          <span className="ml-2 font-mono text-xs text-muted">
            {evidenceInputs.length}
          </span>
        </h2>
        {(() => {
          const streamCounts = evidenceInputs.reduce((acc, input) => {
            const s = input.stream ?? 'untagged'
            acc[s] = (acc[s] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          const taggedCount = evidenceInputs.filter((i) => i.stream).length
          if (taggedCount < 2) return null
          return (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-dim">Streams:</span>
              {Object.entries(streamCounts)
                .filter(([key]) => key !== 'untagged')
                .map(([key, ct]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${streamBadge(key)}`}
                  >
                    {streamLabel(key)} ({ct})
                  </span>
                ))}
              {streamCounts['untagged'] && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-panel-alt text-dim">
                  Untagged ({streamCounts['untagged']})
                </span>
              )}
            </div>
          )
        })()}
        {evidenceInputs.length === 0 ? (
          <p className="py-4 text-center text-sm italic text-muted">
            No supporting inputs found
          </p>
        ) : (
          <div className="space-y-3">
            {evidenceInputs.map((input, i) => (
              <div
                key={input.id}
                className="animate-fade-up rounded-xl border border-edge bg-panel p-4"
                style={{ animationDelay: `${380 + i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-ink">
                    {input.summary ?? input.rawContent}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {input.stream && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${streamBadge(input.stream)}`}>
                        {streamLabel(input.stream)}
                      </span>
                    )}
                    {input.type && (
                      <span className="rounded-full bg-panel-alt px-2 py-0.5 text-[11px] font-medium text-dim">
                        {input.type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span>{input.source}</span>
                  <span>&middot;</span>
                  <span>{input.contributor}</span>
                  <span>&middot;</span>
                  <span>
                    {new Date(input.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
