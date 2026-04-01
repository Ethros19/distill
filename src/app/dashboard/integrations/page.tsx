export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ApiKeyForm } from './api-key-form'

interface Integration {
  name: string
  description: string
  status: 'connected' | 'not_configured' | 'planned'
  category: 'delivery' | 'intake' | 'ai' | 'tooling'
  configKeys?: string[]
  setupSteps?: string[]
}

function getIntegrations(): Integration[] {
  const hasLinear = !!(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID)
  const hasLinearWebhook = !!process.env.LINEAR_WEBHOOK_SECRET
  const hasLinearIntake = process.env.LINEAR_INTAKE_ENABLED === 'true' && hasLinear
  const hasResend = !!process.env.RESEND_API_KEY
  const hasDigest = !!(process.env.RESEND_API_KEY && process.env.DIGEST_RECIPIENTS)
  const llmProvider = process.env.LLM_PROVIDER || 'anthropic'
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasOllama = !!process.env.OLLAMA_BASE_URL

  return [
    {
      name: 'Linear (Push)',
      description: 'Push signals to Linear as issues. Creates a linked issue from any signal detail page.',
      status: hasLinear ? 'connected' : 'not_configured',
      category: 'delivery',
      configKeys: ['LINEAR_API_KEY', 'LINEAR_TEAM_ID'],
      setupSteps: [
        'Go to Linear \u2192 Settings \u2192 API \u2192 Personal API keys',
        'Create a new key and copy it',
        'Find your Team ID in Linear \u2192 Settings \u2192 Teams \u2192 click your team (UUID is in the URL)',
        'Add LINEAR_API_KEY and LINEAR_TEAM_ID as environment variables',
      ],
    },
    {
      name: 'Linear (Two-Way Sync)',
      description: 'Sync issue status changes back to signals via webhook. When an issue moves to "Done" in Linear, the signal resolves in Distill.',
      status: hasLinearWebhook ? 'connected' : 'not_configured',
      category: 'delivery',
      configKeys: ['LINEAR_WEBHOOK_SECRET'],
      setupSteps: [
        'Go to Linear \u2192 Settings \u2192 API \u2192 Webhooks \u2192 New webhook',
        `Set the URL to ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/webhooks/linear`,
        'Subscribe to: Issues, Comments, Customer requests, Project updates, Initiative updates, Documents',
        'Copy the signing secret and add it as LINEAR_WEBHOOK_SECRET',
      ],
    },
    {
      name: 'Linear (Intake Source)',
      description: 'Import new Linear issues, comments, customer requests, project updates, initiative updates, and documents as inputs for synthesis.',
      status: hasLinearIntake ? 'connected' : 'not_configured',
      category: 'intake',
      configKeys: ['LINEAR_INTAKE_ENABLED'],
      setupSteps: [
        'First, set up Linear (Push) and Linear (Two-Way Sync) above',
        'Set LINEAR_INTAKE_ENABLED=true as an environment variable',
        'New Linear events will be ingested as inputs and AI-structured automatically',
      ],
    },
    {
      name: 'Resend (Email Intake)',
      description: 'Receive feedback via email webhook. Inbound emails become inputs.',
      status: hasResend ? 'connected' : 'not_configured',
      category: 'intake',
      configKeys: ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET'],
      setupSteps: [
        'Add a domain in Resend (e.g., signals.yourdomain.com)',
        `Set up an inbound webhook pointing to ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/webhooks/resend`,
        'Add RESEND_API_KEY and RESEND_WEBHOOK_SECRET as environment variables',
      ],
    },
    {
      name: 'Resend (Digest)',
      description: 'Daily synthesis digest email to your team.',
      status: hasDigest ? 'connected' : 'not_configured',
      category: 'delivery',
      configKeys: ['RESEND_API_KEY', 'RESEND_FROM_ADDRESS', 'DIGEST_RECIPIENTS'],
      setupSteps: [
        'First, set up Resend (Email Intake) above for the API key',
        'Set RESEND_FROM_ADDRESS to a verified sender (e.g., Distill <signals@yourdomain.com>)',
        'Set DIGEST_RECIPIENTS to comma-separated email addresses',
      ],
    },
    {
      name: 'Anthropic Claude',
      description: `AI provider for structuring and synthesis.${llmProvider === 'anthropic' ? ' Currently active.' : ''}`,
      status: hasAnthropic ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['ANTHROPIC_API_KEY'],
      setupSteps: [
        'Get an API key from console.anthropic.com',
        'Add ANTHROPIC_API_KEY as an environment variable',
        'Set LLM_PROVIDER=anthropic (or leave unset \u2014 Anthropic is the default)',
      ],
    },
    {
      name: 'OpenAI',
      description: `Alternative AI provider.${llmProvider === 'openai' ? ' Currently active.' : ''}`,
      status: hasOpenAI ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['OPENAI_API_KEY'],
      setupSteps: [
        'Get an API key from platform.openai.com/api-keys',
        'Add OPENAI_API_KEY as an environment variable',
        'Set LLM_PROVIDER=openai to activate',
      ],
    },
    {
      name: 'Ollama',
      description: `Local AI provider for self-hosted LLMs.${llmProvider === 'ollama' ? ' Currently active.' : ''}`,
      status: hasOllama ? 'connected' : 'not_configured',
      category: 'ai',
      configKeys: ['OLLAMA_BASE_URL'],
      setupSteps: [
        'Install and run Ollama locally (ollama.com)',
        'Set OLLAMA_BASE_URL (default: http://localhost:11434)',
        'Set LLM_PROVIDER=ollama to activate',
      ],
    },
    {
      name: 'MCP Server',
      description: 'Chat with your Distill data from Claude Desktop. Read-only access to signals, themes, and inputs.',
      status: 'connected',
      category: 'tooling',
      setupSteps: [
        'Run: cd mcp-server && npm install && npm run build',
        'Add to Claude Desktop config (see README for full JSON)',
        'Provides tools: get_signals, get_signal_detail, get_themes, search_inputs, get_synthesis_summary',
      ],
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

          {group.category === 'ai' && (
            <div className="mb-2">
              <ApiKeyForm envProvider={process.env.LLM_PROVIDER || 'anthropic'} />
            </div>
          )}

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

                    {integration.setupSteps && integration.status === 'not_configured' && (
                      <div className="mt-3 rounded-lg border border-edge-dim bg-canvas p-3">
                        <p className="mb-2 text-xs font-medium text-dim">Setup</p>
                        <ol className="space-y-1.5">
                          {integration.setupSteps.map((step, i) => (
                            <li key={i} className="flex gap-2 text-xs text-muted">
                              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-panel-alt text-[10px] font-medium text-dim">
                                {i + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        {integration.configKeys && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-edge-dim pt-2">
                            {integration.configKeys.map((k) => (
                              <code key={k} className="rounded bg-panel-alt px-1.5 py-0.5 text-[10px] text-dim">
                                {k}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {integration.status === 'connected' && integration.setupSteps && (
                      <p className="mt-2 text-[11px] text-dim">
                        {integration.configKeys?.map((k) => (
                          <code key={k} className="mr-1 rounded bg-sig-low/10 px-1 py-0.5 text-sig-low">
                            {k} ✓
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
          All integrations are configured via environment variables.{' '}
          <a
            href="https://github.com/Ethros19/distill#optional-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-ink"
          >
            View full setup guide
          </a>
        </p>
      </div>
    </div>
  )
}
