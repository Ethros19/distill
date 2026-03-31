# Distill

Open-source signal intelligence for product teams. Collects feedback from email, paste, and RSS feeds, structures it with AI, and synthesizes recurring patterns into actionable signals.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## What It Does

1. **Collect** -- feedback arrives via email webhook, paste API, or RSS feed polling
2. **Structure** -- AI extracts summary, type, themes, urgency, and domain stream from each input
3. **Synthesize** -- a daily cron clusters recent inputs into signals (recurring patterns backed by evidence)
4. **Deliver** -- digest email goes out, dashboard shows everything, MCP server lets you chat with your data

Your data stays on your infrastructure. There is no hosted service.

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Hosting** | Vercel (serverless functions, cron jobs) |
| **Database** | Neon Postgres (via Drizzle ORM) |
| **LLM** | Anthropic Claude (default), OpenAI, or Ollama -- swappable via env var |
| **Email** | Resend (inbound webhook + outbound digest) |
| **Storage** | Vercel Blob (digest archival) |
| **Integrations** | Linear (push signals to issues), MCP Server (chat with signals from Claude Desktop) |

## Quick Start

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- An [Anthropic](https://console.anthropic.com), [OpenAI](https://platform.openai.com), or [Ollama](https://ollama.com) account for LLM
- A [Resend](https://resend.com) account (for email intake and digest delivery)

### 1. Clone and install

```bash
git clone https://github.com/Ethros19/distill.git
cd distill
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the required values. At minimum you need:

| Variable | How to get it |
|----------|---------------|
| `DATABASE_URL` | [neon.tech](https://neon.tech) > your project > Connection Details |
| `AUTH_PASSWORD_HASH` | Run `npx tsx scripts/hash-password.ts your-password` |
| `CRON_SECRET` | Run `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_WEBHOOK_SECRET` | Resend dashboard > Webhooks > your webhook > Signing Secret |

See [`.env.example`](.env.example) for all variables with detailed descriptions.

### 3. Push database schema

```bash
npx drizzle-kit push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the password you hashed.

### 5. Deploy to Vercel

```bash
npx vercel deploy --prod
```

Add env vars in the Vercel dashboard (Settings > Environment Variables) or via CLI:

```bash
npx vercel env add DATABASE_URL
npx vercel env add AUTH_PASSWORD_HASH
# ... etc
```

Vercel auto-detects Next.js and reads `vercel.json` for cron schedules.

## Features

### Dashboard
Main overview showing latest synthesis at a glance -- signal count, input count, unprocessed items, and when synthesis last ran.

### Signals
Browse all detected signals with filtering by synthesis period, status, and search. Each signal shows its statement, reasoning, evidence (linked inputs), themes, and a suggested action. Statuses: `new` > `acknowledged` > `in_progress` > `resolved`.

### Intelligence Radar
AI-synthesized intelligence briefs across 6 domain streams (general AI, product, event tech, event industry, VC/investment, and your product's own stream). Each stream card shows a synopsis of recent activity with expandable articles.

### Streams
Cross-stream synthesis view with an AI-generated narrative connecting internal product signals with external industry intelligence. Includes market validation, cross-stream pattern detection, and a themes heatmap.

### Inputs
Reference layer for all raw data. Paginated with filtering by processing status, domain stream, and keyword search. Includes a source health panel showing feed status.

### Sources
Manage RSS feed sources -- add feeds, set polling intervals, enable/disable, view health status, and trigger manual polls. Seed sample feeds with one click.

### Signal Detail
Full signal view with reasoning, evidence trail, suggested action, and theme tags. Add notes, change status, and push to Linear with one click.

### Settings
Configure product context -- tell the LLM what features you've already shipped so synthesis focuses on what's genuinely missing rather than re-surfacing known capabilities.

## Sending Feedback

### Email (recommended)

Forward or send feedback to your configured Resend inbound address (e.g., `signals@yourdomain.com`). Works from any email client. One piece of feedback per email works best.

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

Add feeds in the Sources page (`/dashboard/sources`). Distill polls them on a configurable interval, ingests new articles, structures them with AI, and tags them with a domain stream for cross-stream analysis.

## Cron Jobs

Configured in `vercel.json`. Requires the `CRON_SECRET` env var for authentication.

| Job | Schedule | What it does |
|-----|----------|--------------|
| `/api/cron/daily` | 6:30am UTC daily | Retries structuring for failed/unprocessed inputs, cleans expired sessions |
| `/api/cron/synthesis` | 7:00am UTC daily | Polls RSS feeds, runs synthesis on recent inputs, generates narrative, sends digest email |

To change the schedule, edit `vercel.json` and redeploy. Manual synthesis is also available via the dashboard button or `POST /api/synthesis`.

## Email Setup (Resend)

1. Add a domain in [Resend](https://resend.com) (e.g., `signals.yourdomain.com`)
2. Set up an inbound webhook pointing to `https://your-app.vercel.app/api/webhooks/resend`
3. Copy the webhook signing secret to `RESEND_WEBHOOK_SECRET` env var
4. Set `RESEND_FROM_ADDRESS` to customize the digest sender
5. Set `DIGEST_RECIPIENTS` to the comma-separated emails that should receive the daily digest

## MCP Server (Claude Desktop)

Chat with your Distill data from Claude Desktop using the included MCP server. Read-only access to signals, themes, inputs, and synthesis data.

```bash
cd mcp-server
npm install
npm run build
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "distill": {
      "command": "node",
      "args": ["/path/to/distill/mcp-server/build/index.js"],
      "env": {
        "DATABASE_URL": "your-neon-connection-string"
      }
    }
  }
}
```

Available tools: `get_signals`, `get_signal_detail`, `get_themes`, `search_inputs`, `get_synthesis_summary`.

See [mcp-server/README.md](mcp-server/README.md) for full setup details.

## Linear Integration

Set `LINEAR_API_KEY` and `LINEAR_TEAM_ID` in your environment. A "Push to Linear" button appears on signal detail pages, creating an issue with the signal's statement, reasoning, evidence, and suggested action.

Get your API key from Linear > Settings > API > Personal API keys. Find your team ID in the URL when viewing your team in Linear settings.

## LLM Providers

Set `LLM_PROVIDER` to switch between providers:

| Provider | `LLM_PROVIDER` | Required Env Var | Structure Model | Synthesis Model |
|----------|----------------|------------------|-----------------|-----------------|
| **Anthropic** (default) | `anthropic` | `ANTHROPIC_API_KEY` | Claude Haiku 4.5 | Claude Sonnet 4.6 |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | GPT-4o Mini | GPT-4o |
| **Ollama** | `ollama` | `OLLAMA_BASE_URL` | Llama 3.2 | Llama 3.2 |

Model names are configurable per provider. See `.env.example` for override variables.

## Product Context

Product context tells Distill what your product already has so synthesis focuses on what's genuinely missing rather than re-surfacing shipped features.

1. Open your product's codebase in an AI assistant
2. Ask it to scan and list all user-facing features, marking each as built, missing, or partial
3. Paste the output into Settings > Product Context in the Distill dashboard

Update it after each major release or sprint.

## Database

Distill uses [Drizzle ORM](https://orm.drizzle.team) with Neon Postgres.

```bash
npm run db:push      # Push schema directly (initial setup)
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Run pending migrations
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
├── migrations/                 # Drizzle database migrations
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

## License

[AGPL-3.0](LICENSE)
