export const dynamic = 'force-dynamic'

import Link from 'next/link'

interface Integration {
  name: string
  description: string
  status: 'connected' | 'not_configured' | 'planned'
  category: 'delivery' | 'intake' | 'ai' | 'tooling'
  docsHref?: string
  configKeys?: string[]
}

function getIntegrations(): Integration[] {
  const hasLinear = !!(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID)
  const hasResend = !!process.env.RESEND_API_KEY
  const hasDigest = !!(process.env.RESEND_API_KEY && process.env.DIGEST_RECIPIENTS)
  const llmProvider = process.env.LLM_PROVIDER || 'anthropic'
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasOllama = !!process.env.OLLAMA_BASE_URL

  return [
    {
      name: 'Linear',
      description: 'Push signals to Linear as issues. One-way: signal → issue.',
      status: hasLinear ? 'connected' : 'not_configured',
      category: 'delivery',
      configKeys: ['LINEAR_API_KEY', 'LINEAR_TEAM_ID'],
    },
    {
      name: 'Resend (Email Intake)',
      description: 'Receive feedback via email webhook. Inbound emails become inputs.',
      status: hasResend ? 'connected' : 'not_configured',
      category: 'intake',
      configKeys: ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET'],
    },
    {
      name: 'Resend (Digest)',
      description: 'Daily synthesis digest email to your team.',
      status: hasDigest ? 'connected' : 'not_configured',
      category: 'delivery',
      configKeys: ['RESEND_API_KEY', 'RESEND_FROM_ADDRESS', 'DIGEST_RECIPIENTS'],
    },
    {
      name: 'Anthropic Claude',
      description: `AI provider for structuring and synthesis.${llmProvider === 'anthropic' ? ' Currently active.' : ''}`,
      status: hasAnthropic ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['ANTHROPIC_API_KEY'],
    },
    {
      name: 'OpenAI',
      description: `Alternative AI provider.${llmProvider === 'openai' ? ' Currently active.' : ''}`,
      status: hasOpenAI ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['OPENAI_API_KEY'],
    },
    {
      name: 'Ollama',
      description: `Local AI provider for self-hosted LLMs.${llmProvider === 'ollama' ? ' Currently active.' : ''}`,
      status: hasOllama ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['OLLAMA_BASE_URL'],
    },
    {
      name: 'MCP Server',
      description: 'Chat with your Distill data from Claude Desktop. Read-only access to signals, themes, and inputs.',
      status: 'connected',
      category: 'tooling',
    },
    {
      name: 'Linear (Two-Way Sync)',
      description: 'Sync issue status changes back to signals via webhook. Keep both systems in sync.',
      status: 'planned',
      category: 'delivery',
    },
    {
      name: 'Linear (Signal Source)',
      description: 'Import Linear issues and comments as inputs. Surface existing roadmap items alongside new signals.',
      status: 'planned',
      category: 'intake',
    },
    {
      name: 'Slack',
      description: 'Forward messages from Slack channels as inputs. Surface signals from team conversations.',
      status: 'planned',
      category: 'intake',
    },
    {
      name: 'GitHub',
      description: 'Ingest issues and discussions as inputs. Detect signals from developer feedback.',
      status: 'planned',
      category: 'intake',
    },
  ]
}

const categoryLabels: Record<string, string> = {
  intake: 'Intake Sources',
  delivery: 'Delivery & Actions',
  ai: 'AI Providers',
  tooling: 'Tooling',
}

const categoryOrder = ['intake', 'delivery', 'ai', 'tooling']

function StatusBadge({ status }: { status: Integration['status'] }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sig-low/10 px-2 py-0.5 text-xs font-medium text-sig-low">
        <span className="h-1.5 w-1.5 rounded-full bg-sig-low" />
        Connected
      </span>
    )
  }
  if (status === 'planned') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
        Planned
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-panel-alt px-2 py-0.5 text-xs font-medium text-muted">
      Not configured
    </span>
  )
}

export default function IntegrationsPage() {
  const integrations = getIntegrations()
  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    items: integrations.filter((i) => i.category === cat),
  }))

  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const totalConfigurable = integrations.filter((i) => i.status !== 'planned').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Integrations</h2>
          <p className="mt-1 text-sm text-muted">
            {connectedCount} of {totalConfigurable} integrations connected
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-accent transition-colors hover:text-ink"
        >
          &larr; Back to dashboard
        </Link>
      </div>

      {grouped.map((group) => (
        <div key={group.category}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dim">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.items.map((integration) => (
              <div
                key={integration.name}
                className={`rounded-xl border bg-panel p-4 ${
                  integration.status === 'planned'
                    ? 'border-dashed border-edge-dim'
                    : 'border-edge'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-medium ${
                        integration.status === 'planned' ? 'text-dim' : 'text-ink'
                      }`}>
                        {integration.name}
                      </h4>
                      <StatusBadge status={integration.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {integration.description}
                    </p>
                    {integration.configKeys && integration.status === 'not_configured' && (
                      <p className="mt-2 text-xs text-dim">
                        Requires: {integration.configKeys.map((k) => (
                          <code key={k} className="mx-0.5 rounded bg-panel-alt px-1 py-0.5 text-[11px]">
                            {k}
                          </code>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-dashed border-edge-dim bg-panel/50 p-4 text-center">
        <p className="text-xs text-muted">
          Integrations are configured via environment variables.{' '}
          <a
            href="https://github.com/Ethros19/distill#optional-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-ink"
          >
            View setup guide
          </a>
        </p>
      </div>
    </div>
  )
}
