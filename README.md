# Distill

Open-source signal intelligence for product teams. Collects feedback from email, paste, URLs, RSS feeds, and Linear, structures it with AI, and synthesizes recurring patterns into actionable signals. Inspired by [WorldMonitor](https://www.worldmonitor.app/).

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEthros19%2Fdistill&env=DATABASE_URL,AUTH_PASSWORD_HASH,ANTHROPIC_API_KEY&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2FEthros19%2Fdistill%23quick-start&project-name=distill&repository-name=distill)

## What It Does

1. **Collect** -- feedback arrives via email webhook, paste, article URLs, RSS feeds, or Linear events
2. **Structure** -- AI extracts summary, type, themes, urgency, and domain stream from each input
3. **Synthesize** -- a daily cron clusters recent inputs into signals (recurring patterns backed by evidence)
4. **Deliver** -- digest email goes out, dashboard shows everything, Linear issues get created, MCP server lets you chat with your data

Your data stays on your infrastructure. There is no hosted service.

## Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │              Neon Postgres                  │
                         │  inputs · signals · syntheses · feeds      │
                         └────────▲──────────────┬────────────────────┘
                                  │              │
  Email ──→ Resend Webhook ──┐    │              │
                             ├──→ Intake API ────┘
  Paste ──→ Paste API ───────┤         │
  URLs  ──→ URL Fetcher ─────┤         │
  Linear ──→ Linear Webhook ─┘         ▼
                                 LLM Structuring
  RSS Feeds ──→ Feed Poller ──→  (summary, themes,
                                  urgency, stream)
                                       │
                              ┌────────┴────────┐
                              ▼                  ▼
                     Daily Synthesis      Manual Trigger
                     (6:30am + 7am UTC)   (POST /api/synthesis)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              LLM Signal   Narrative  Digest
              Clustering   Generation Email
                    │         │         │
                    ▼         ▼         ▼
              Dashboard    Streams   Resend
              + Radar      Page      → Recipients
                    │
                    ▼
              MCP Server ──→ Claude Desktop
              Linear     ←─→ Issue Tracker
```

## Quick Start

You need two things to run Distill: a Postgres database and an LLM API key.

### 1. Clone and install

```bash
git clone https://github.com/Ethros19/distill.git
cd distill
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Set these two required variables:

| Variable | How to get it |
|----------|---------------|
| `DATABASE_URL` | [neon.tech](https://neon.tech) > your project > Connection Details |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

Then generate a login password:

```bash
npx tsx scripts/hash-password.ts your-password
```

Copy the hash into `AUTH_PASSWORD_HASH` in `.env.local`. That's it -- everything else is optional.

### 3. Push database schema and run

```bash
npx drizzle-kit push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your password.

### 4. Follow the setup checklist

The dashboard shows a guided checklist on first login:

1. **Configure your streams** -- define your intelligence categories (or keep the defaults)
2. **Describe your product** -- give the AI context about what you've already built
3. **Add your first input** -- paste a customer quote, support ticket, or observation
4. **Set up RSS feeds** -- add news sources or seed 24+ curated feeds with one click
5. **Run your first synthesis** -- let Distill analyze your inputs and surface signals

Each step links to the relevant page. The checklist disappears once everything is set up.

## Deploy to Vercel

```bash
npx vercel deploy --prod
```

Add env vars in the Vercel dashboard (Settings > Environment Variables) or via CLI:

```bash
npx vercel env add DATABASE_URL
npx vercel env add AUTH_PASSWORD_HASH
npx vercel env add ANTHROPIC_API_KEY
```

Vercel auto-detects Next.js and reads `vercel.json` for cron schedules. For cron jobs to work, also add `CRON_SECRET` (run `openssl rand -hex 32` to generate one).

## Optional Integrations

These are not required to use Distill. Add them when you're ready.

### Email intake and digest (Resend)

Lets users send feedback via email and receive daily digest summaries.

1. Add a domain in [Resend](https://resend.com) (e.g., `signals.yourdomain.com`)
2. Set up an inbound webhook pointing to `https://your-app.vercel.app/api/webhooks/resend`
3. Add these env vars:

| Variable | What it does |
|----------|-------------|
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_WEBHOOK_SECRET` | Resend dashboard > Webhooks > Signing Secret |
| `RESEND_FROM_ADDRESS` | Digest sender address (e.g., `Distill <signals@yourdomain.com>`) |
| `DIGEST_RECIPIENTS` | Comma-separated emails for the daily digest |

### Linear integration

Connect Distill to Linear for issue tracking, two-way status sync, and using Linear as an intake source.

**Push to Linear** — adds a button on signal detail pages to create a Linear issue from any signal.

| Variable | How to get it |
|----------|---------------|
| `LINEAR_API_KEY` | Linear > Settings > API > Personal API keys |
| `LINEAR_TEAM_ID` | Team UUID from URL in Linear team settings |

**Two-way sync** — when an issue status changes in Linear, the linked signal updates automatically in Distill (e.g., issue marked "Done" → signal resolves).

**Linear as intake source** — new issues, comments, customer requests, project updates, initiative updates, and documents flow into Distill as inputs for synthesis.

To enable sync and intake:

1. In Linear, go to Settings > API > Webhooks > New webhook
2. Set URL to `https://your-app.vercel.app/api/webhooks/linear`
3. Subscribe to: Issues, Comments, Customer requests, Project updates, Initiative updates, Documents
4. Copy the signing secret and add these env vars:

| Variable | What it does |
|----------|-------------|
| `LINEAR_WEBHOOK_SECRET` | Signing secret from the Linear webhook |
| `LINEAR_INTAKE_ENABLED` | Set to `true` to ingest Linear events as inputs |

### MCP Server (Claude Desktop)

Chat with your Distill data from Claude Desktop. Read-only access to signals, themes, inputs, and synthesis data.

```bash
cd mcp-server && npm install && npm run build
```

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "distill": {
      "command": "node",
      "args": ["/path/to/distill/mcp-server/build/index.js"],
      "env": { "DATABASE_URL": "your-neon-connection-string" }
    }
  }
}
```

Tools: `get_signals`, `get_signal_detail`, `get_themes`, `search_inputs`, `get_synthesis_summary`. See [mcp-server/README.md](mcp-server/README.md) for details.

### Alternative LLM providers

Default is Anthropic. Switch by setting `LLM_PROVIDER`:

| Provider | `LLM_PROVIDER` | Required Env Var | Structure Model | Synthesis Model |
|----------|----------------|------------------|-----------------|-----------------|
| **Anthropic** (default) | `anthropic` | `ANTHROPIC_API_KEY` | Claude Haiku 4.5 | Claude Sonnet 4.6 / Opus 4.6 |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | GPT-4o Mini | GPT-4o |
| **Ollama** | `ollama` | `OLLAMA_BASE_URL` | Llama 3.2 | Llama 3.2 |

Model names are configurable per provider. See `.env.example` for override variables.

### Company branding

Set `COMPANY_NAME` and `COMPANY_DESCRIPTION` env vars to personalize the Intelligence Radar analysis (e.g., "What this means for Acme Corp"). Without these, prompts use generic phrasing.

You can also set a company name and upload a logo from **Settings** in the dashboard -- these override the env vars and appear in the header.

## Features

### Dashboard
Main intelligence overview with setup checklist for new users, latest synthesis at a glance, signal strength distribution, stream distribution, theme heatmap, and signal timeline.

### Signals
Browse all detected signals with filtering by synthesis period, status (`new`, `acknowledged`, `in_progress`, `resolved`), and text search. Each signal card shows strength rating, theme tags, status badge, and links to full detail. Inline status dropdown for quick triage.

### Signal Detail
Full signal view at `/dashboard/signals/[id]` with statement, reasoning, suggested action, evidence trail with expandable raw input content, theme tags, editable notes, status lifecycle controls, and push to Linear.

### Intelligence Radar
AI-synthesized intelligence briefs across configurable domain streams. Each stream card shows a "What this means" synopsis with expandable articles. Cards are drag-to-reorder. Synopses are cached in-memory (1hr TTL).

### Streams
Cross-stream synthesis view with AI-generated narrative, market validation, cross-stream highlights, per-stream drill-down pages with volume charts and top themes, and theme heatmap.

### Inputs
Raw data reference layer with paginated list, filtering by status/stream/keyword, source health panel, stream coverage grid, and per-input controls (notes, feedback classification, delete).

### Sources
Feed source management: add RSS/Atom feeds, enable/disable, view health status, manual poll, and seed 24+ curated feeds with one button.

### Integrations
View all connected and available integrations at `/dashboard/integrations`. Shows connection status for Linear (push, two-way sync, intake), Resend (email intake, digest), AI providers, and MCP server. Configure AI provider API keys directly from the UI (stored in database, overrides env vars). Inline setup instructions for each unconfigured integration. Planned integrations (Slack, GitHub) shown for visibility.

### Settings
Stream editor (drag-and-drop reordering, color picker, feed categories), product context editor, and theme switcher (light/dark/system).

### Security
Bcrypt password hashing, database-backed rate limiting with escalating lockout, session rotation, 4-hour idle timeout, CSRF protection, and security headers.

## Sending Feedback

### Paste (in-app)

Click **+ Add Feedback** on the dashboard to paste customer quotes, support tickets, or observations.

### URL (in-app)

Click **+ Add Source** on the dashboard to paste an article URL. Distill fetches the content automatically. If the site blocks automated access, a paste fallback appears so you can copy/paste the article text directly.

### Email

Forward feedback to your configured Resend inbound address. Requires the Resend integration above.

### Paste API

```bash
curl -X POST https://your-app.vercel.app/api/intake/paste \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "content": "Customer says the onboarding flow is confusing...",
    "source": "slack",
    "contributor": "jane@company.com"
  }'
```

### RSS Feeds

Add feeds in Sources (`/dashboard/sources`). Distill polls them on a configurable interval and tags articles with a domain stream for cross-stream analysis.

## Cron Jobs

Configured in `vercel.json`. Requires `CRON_SECRET` env var.

| Job | Schedule | What it does |
|-----|----------|--------------|
| `/api/cron/daily` | 6:30am UTC daily | Retries structuring for failed/unprocessed inputs, cleans expired sessions |
| `/api/cron/synthesis` | 7:00am UTC daily | Polls RSS feeds, runs synthesis on recent inputs, generates narrative, sends digest email |

Edit `vercel.json` to change the schedule. Manual synthesis is available via the dashboard button or `POST /api/synthesis`.

## Configuring Streams

The easiest way is through the **Settings page** in the dashboard -- add, remove, reorder, and customize streams with a visual editor. Changes are saved to the database.

You can also set defaults in `distill.config.ts` for new deployments:

```typescript
export const streams: StreamConfig[] = [
  {
    id: 'general-ai',           // URL slug and database value
    label: 'AI & LLM',          // UI display name
    description: 'AI model releases, API changes, research', // LLM classification prompt
    hex: '#a855f7',             // Color for charts, badges, borders
    highVolume: true,           // Lower query limit in synthesis
    categories: ['AI News'],    // RSS feed categories that map here
  },
  {
    id: 'product',
    label: 'Product Feedback',
    description: 'Direct product feedback, feature requests',
    hex: '#3D8A4A',
    pinFirst: true,             // Pin first on Intelligence Radar
  },
]
```

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Hosting** | Vercel (serverless functions, cron jobs) |
| **Database** | Neon Postgres (via Drizzle ORM) |
| **LLM** | Anthropic Claude (default), OpenAI, or Ollama |
| **Email** | Resend (inbound webhook + outbound digest) |
| **Storage** | Vercel Blob (digest archival) |
| **Integrations** | Linear (issues), MCP Server (Claude Desktop) |

## Database

```bash
npm run db:push      # Push schema directly (initial setup + updates)
npm run db:studio    # Open Drizzle Studio GUI
```

## Project Structure

```
distill/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # REST API + cron + webhook endpoints
│   │   ├── dashboard/          # Dashboard pages and components
│   │   └── login/              # Authentication page
│   ├── lib/                    # Shared libraries
│   │   ├── llm/                # Provider interface and types
│   │   ├── providers/          # LLM implementations (Anthropic, OpenAI, Ollama)
│   │   ├── auth.ts             # Session management
│   │   ├── db.ts               # Database connection
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── synthesis.ts        # Synthesis orchestration
│   │   ├── digest.ts           # Digest rendering
│   │   ├── email.ts            # Email delivery via Resend
│   │   └── feed-poller.ts      # RSS feed polling and ingestion
│   └── middleware.ts           # Auth guard (protects dashboard + API routes)
├── mcp-server/                 # MCP server for Claude Desktop integration
├── distill.config.ts           # Default stream taxonomy
├── scripts/
│   └── hash-password.ts        # Generate bcrypt password hash
├── tests/                      # Vitest test files
├── docs/                       # Documentation
└── vercel.json                 # Vercel cron job configuration
```

## Development

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npx vitest        # Run tests
```

## Development History

Built across 310+ commits in 4 milestones:

**Milestone 1: Foundation** -- Intake, structuring, synthesis pipeline, digest email, basic dashboard with signal cards and theme sidebar.

**Milestone 2: Dashboard Redesign** -- Full UI redesign with design system, signal strength charts, stream distribution, theme heatmap, intelligence panels, and dark/light theme support.

**Milestone 3: Signal Actions & Intelligence Feeds** -- Login security hardening, signal status lifecycle, MCP server, Linear integration, input management, RSS feeds, configurable sources UI, cross-stream tagging, and dashboard intelligence upgrades.

**Milestone 4: Dashboard IA & Synthesis Visibility** -- Dashboard restructure, dedicated signals page, streams synthesis view with AI narrative, input reference layer, URL article intake with paste fallback, in-app AI provider configuration, and integrations hub with inline setup guides.

Built with [Claude Code](https://claude.ai/code) using the [VBW](https://github.com/swt-labs/vibe-better-with-claude-code-vbw) agentic development workflow.

## Powered by Distill

Using Distill? Add your instance here by [opening a PR](https://github.com/Ethros19/distill/edit/main/README.md) or [filing an issue](https://github.com/Ethros19/distill/issues/new?title=Add+my+instance+to+Powered+by+Distill&body=Name:%0AURL%20(optional):%0AHow%20you%20use%20it:).

<!-- Add your instance below this line -->

*Be the first to add yours!*

## License

[AGPL-3.0](LICENSE)
