import Link from 'next/link'
import { db } from '@/lib/db'
import { settings, inputs, feedSources, syntheses } from '@/lib/schema'
import { eq, count } from 'drizzle-orm'

export interface SetupStatus {
  hasStreams: boolean
  hasProductContext: boolean
  hasInputs: boolean
  hasFeeds: boolean
  hasSynthesis: boolean
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const [streamRow, contextRow, inputCount, feedCount, synthesisCount] =
    await Promise.all([
      db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'stream_config'))
        .then((rows) => rows[0]),
      db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'product_context'))
        .then((rows) => rows[0]),
      db
        .select({ value: count() })
        .from(inputs)
        .then((rows) => rows[0].value),
      db
        .select({ value: count() })
        .from(feedSources)
        .then((rows) => rows[0].value),
      db
        .select({ value: count() })
        .from(syntheses)
        .then((rows) => rows[0].value),
    ])

  return {
    hasStreams: !!streamRow?.value,
    hasProductContext: !!(contextRow?.value && contextRow.value.trim().length > 0),
    hasInputs: inputCount > 0,
    hasFeeds: feedCount > 0,
    hasSynthesis: synthesisCount > 0,
  }
}

export function isSetupComplete(status: SetupStatus): boolean {
  return (
    status.hasStreams &&
    status.hasProductContext &&
    status.hasInputs &&
    status.hasFeeds &&
    status.hasSynthesis
  )
}

const steps: {
  key: keyof SetupStatus
  number: number
  title: string
  description: string
  action: string
  href: string
}[] = [
  {
    key: 'hasStreams',
    number: 1,
    title: 'Configure your streams',
    description:
      'Streams are your intelligence categories — define them to match your domain, or use the defaults.',
    action: 'Set up streams',
    href: '/dashboard/settings',
  },
  {
    key: 'hasProductContext',
    number: 2,
    title: 'Describe your product',
    description:
      'Product context helps the AI distinguish existing features from new requests during synthesis.',
    action: 'Add context',
    href: '/dashboard/settings',
  },
  {
    key: 'hasInputs',
    number: 3,
    title: 'Add your first input',
    description:
      'Paste a customer quote, support ticket, or observation. This is what Distill analyzes.',
    action: 'Paste feedback',
    href: '/dashboard/inputs',
  },
  {
    key: 'hasFeeds',
    number: 4,
    title: 'Set up RSS feeds',
    description:
      'Add news and industry feeds for continuous signal ingestion. Seed sample feeds to get started fast.',
    action: 'Add sources',
    href: '/dashboard/sources',
  },
  {
    key: 'hasSynthesis',
    number: 5,
    title: 'Run your first synthesis',
    description:
      'Synthesis analyzes your inputs and surfaces signals, themes, and patterns across streams.',
    action: 'Run synthesis',
    href: '/dashboard',
  },
]

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7.5L5.5 10L11 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SetupChecklist({ status }: { status: SetupStatus }) {
  const doneCount = steps.filter((s) => status[s.key]).length
  const nextStep = steps.find((s) => !status[s.key])

  return (
    <div className="rounded-xl border border-edge bg-panel p-6">
      <div className="mb-5">
        <h2 className="font-display text-lg text-ink">Get started with Distill</h2>
        <p className="mt-1 text-sm text-dim">
          Complete these steps to set up your intelligence system.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-alt">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-dim">
            {doneCount}/{steps.length}
          </span>
        </div>
      </div>

      <ol className="space-y-1">
        {steps.map((step) => {
          const done = status[step.key]
          const isNext = step === nextStep

          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors ${
                  isNext
                    ? 'bg-accent/5 hover:bg-accent/10'
                    : done
                      ? 'opacity-60 hover:opacity-80'
                      : 'hover:bg-panel-alt/50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    done
                      ? 'bg-sig-low/15 text-sig-low'
                      : isNext
                        ? 'bg-accent text-white'
                        : 'bg-panel-alt text-muted'
                  }`}
                >
                  {done ? <CheckIcon /> : step.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      done ? 'text-dim line-through decoration-dim/30' : 'text-ink'
                    }`}
                  >
                    {step.title}
                  </p>
                  {!done && (
                    <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                  )}
                </div>
                {!done && (
                  <span
                    className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      isNext
                        ? 'bg-accent text-white'
                        : 'text-muted group-hover:text-dim'
                    }`}
                  >
                    {step.action}
                    <ArrowIcon />
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
