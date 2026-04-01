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
Main intelligence overview showing latest synthesis at a glance -- signal count, input count, unprocessed items, time since last run. Includes signal strength distribution, stream distribution breakdown, and unsynthesized input count with tooltips.

### Signals
Browse all detected signals with filtering by synthesis period, status (`new`, `acknowledged`, `in_progress`, `resolved`), and text search. Each signal card shows strength rating, theme tags, status badge, and links to full detail. Inline status dropdown for quick triage.

### Signal Detail
Full signal view at `/dashboard/signals/[id]` with:
- Statement, reasoning, and suggested action
- Evidence trail with expandable raw input content
- Theme tags
- Editable notes field for team annotations
- Status lifecycle controls
- **Push to Linear** button (creates an issue with full signal context)

### Intelligence Radar
AI-synthesized intelligence briefs across 6 domain streams:
- **General AI** -- model releases, regulations, research papers
- **Product** -- direct product feedback signals
- **Event Tech** -- event platforms, competition, product launches
- **Event Industry** -- hospitality, venues, trade shows, seasonal trends
- **VC/Investment** -- funding rounds, M&A, startup investments
- **Business Dev** -- AI applications in your vertical, business intelligence

Each stream card shows a "What this means" synopsis with expandable articles. Cards are drag-to-reorder. Synopses are cached in-memory (1hr TTL) to avoid redundant LLM calls.

### Streams
Cross-stream synthesis view with:
- **Synthesis Narrative** -- AI-generated markdown with sections: The Story, Industry Validation, Cross-Stream Patterns, Watch For. Text size S/M/L toggle.
- **Market Validation** -- how industry trends confirm or challenge signals
- **Cross-Stream Highlights** -- themes that bridge multiple domain streams
- **Per-Stream Synthesis Cards** -- drill into individual streams at `/dashboard/streams/[stream]` with volume charts, top themes, and article lists
- **Theme Heatmap** -- visual frequency grid across all themes

### Inputs
Raw data reference layer at `/dashboard/inputs`:
- Paginated list (20 per page) with filtering by processing status, domain stream, and keyword search
- Source health panel showing feed status, error counts, and intake breakdown
- Stream coverage grid showing which streams have active sources
- Per-input controls: edit notes, toggle feedback/noise classification, delete with evidence dependency warnings
- Type badges (feature request, bug report, praise, complaint, observation)

### Sources
Feed source management at `/dashboard/sources`:
- Add new RSS/Atom feeds with URL, name, category, and polling interval
- Enable/disable individual feeds
- View health status (healthy/warning/error), last polled time, error messages
- Input count and mapped stream per source
- One-click manual poll for individual feeds
- Seed 24+ curated industry feeds with one button

### Settings
- **Product Context** -- tell the LLM what features you've shipped so synthesis skips known capabilities
- **Theme Switcher** -- light, dark, and system theme modes

### Security
- Bcrypt password hashing (no plaintext storage)
- Database-backed rate limiting with escalating lockout (5 attempts > 1min lock, 10 > 5min, 15 > 15min)
- Session rotation on login (old sessions invalidated)
- 4-hour idle timeout + 7-day absolute session expiry
- CSRF protection via Origin header validation
- CSP, HSTS, and security headers via Next.js config

### Performance
- SQL-level aggregation (no fetching full tables into JS)
- Batch feed dedup with content hash + URL matching
- Batch signal insertion
- Database indexes on high-query columns (stream, source, contentHash, isFeedback, strength)
- In-memory LLM response caching with TTL for radar synopses
- Sticky header with backdrop blur for navigation

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

## Configuring Streams

Distill's intelligence streams are fully configurable. Edit `distill.config.ts` in the project root to define your own domain taxonomy:

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
  // Add, remove, or rename streams to match your domain
]
```

Each stream supports:
- **`pinFirst`** -- pin this stream to the top of the Intelligence Radar
- **`highVolume`** -- limit query volume in synthesis to avoid prompt bloat
- **`categories`** -- map RSS feed source categories to this stream automatically

After changing streams, run a new synthesis to re-classify inputs. Existing data in the database keeps its original stream value until re-processed.

## Product Context

Product context tells Distill what your product already has so synthesis focuses on what's genuinely missing rather than re-surfacing shipped features.

1. Open your product's codebase in an AI assistant
2. Ask it to scan and list all user-facing features, marking each as built, missing, or partial
3. Paste the output into Settings > Product Context in the Distill dashboard

Update it after each major release or sprint.

## Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │              Neon Postgres                  │
                         │  inputs · signals · syntheses · feeds      │
                         └────────▲──────────────┬────────────────────┘
                                  │              │
  Email ──→ Resend Webhook ──┐    │              │
                             ├──→ Intake API ────┘
  Paste ──→ Paste API ───────┘         │
                                       ▼
  RSS Feeds ──→ Feed Poller ──→  LLM Structuring
                                 (summary, themes,
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
              Linear     ──→ Issue Tracker
```

**Pipeline flow:**
1. Inputs arrive via email webhook, paste API, or RSS feed polling
2. Each input is structured by the LLM (extract summary, type, themes, urgency, domain stream, feedback vs. noise classification)
3. Daily synthesis clusters recent structured inputs into signals, considering prior signal state, product context, and industry inputs
4. A cross-stream narrative is generated connecting signals with industry intelligence
5. Digest email is sent to configured recipients
6. Everything is queryable via dashboard, MCP server, and REST API

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

## Development History

Built across 265+ commits in 4 milestones:

**Milestone 1: Foundation** -- Intake, structuring, synthesis pipeline, digest email, basic dashboard with signal cards and theme sidebar.

**Milestone 2: Dashboard Redesign** -- Full UI redesign with design system, signal strength charts, stream distribution, theme heatmap, intelligence panels, and dark/light theme support.

**Milestone 3: Signal Actions & Intelligence Feeds** -- Login security hardening (bcrypt, rate limiting, session rotation, idle timeout), signal status lifecycle and detail pages, MCP server for Claude Desktop, Linear integration, input management (delete, notes, feedback classification), RSS/web feed ingestion with 24+ curated sources, configurable feed sources UI, cross-stream tagging with 6-domain taxonomy, and dashboard intelligence upgrades (radar, streams, per-stream synthesis, narrative generation).

**Milestone 4: Dashboard IA & Synthesis Visibility** -- Dashboard restructure with focused intelligence overview, dedicated signals page, streams synthesis view with AI narrative and cross-stream pattern detection, input reference layer with source health monitoring, and performance optimizations (SQL aggregation, batch operations, response caching).

Built with [Claude Code](https://claude.ai/code) using the [VBW](https://github.com/swt-labs/vibe-better-with-claude-code-vbw) agentic development workflow.

## License

[AGPL-3.0](LICENSE)
