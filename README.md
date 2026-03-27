# Distill

**Open-source signal intelligence for product teams**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

> **Status: Pre-alpha** — Core pipeline functional, dashboard and polish in progress.

## What is Distill?

Distill captures feedback from any channel — email, paste, or API — structures it with AI, and synthesizes recurring patterns into clear, evidence-backed signals. It helps product teams focus on what to build, not what was said.

Your data stays on your infrastructure. There is no hosted service.

## Architecture

```
                         ┌─────────────────────────────────────────────────┐
                         │                   Neon Postgres                 │
                         └────────▲──────────────┬────────────────────────┘
                                  │              │
  Email ──→ Resend Webhook ──┐    │              │
                             ├──→ Intake API ────┘    Daily Cron (6 AM UTC)
  Paste ──→ Paste API ───────┘                           │
                                                         ▼
                                                  LLM Structuring
                                                  (extract summary,
                                                   themes, urgency)
                                                         │
                                                         ▼
                                                  Weekly Cron (Mon 4 AM UTC)
                                                         │
                                                         ▼
                                                  LLM Synthesis
                                                  (cluster into signals)
                                                         │
                                            ┌────────────┴────────────┐
                                            ▼                         ▼
                                     Digest Email              Dashboard UI
                                     (via Resend)             (Next.js app)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js (App Router, TypeScript) |
| **Hosting** | Vercel |
| **Database** | Neon Postgres (via Drizzle ORM) |
| **LLM** | Anthropic Claude (default), OpenAI, or Ollama |
| **Email** | Resend (intake webhook + digest delivery) |
| **Storage** | Vercel Blob (digest archives) |

## 5-Minute Quickstart

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- An [Anthropic](https://console.anthropic.com), [OpenAI](https://platform.openai.com), or [Ollama](https://ollama.com) account for LLM
- A [Resend](https://resend.com) account for email

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

Open `.env.local` and fill in the required variables. See [`.env.example`](.env.example) for descriptions of each variable.

### 3. Push database schema

```bash
npm run db:push
```

### 4. Start development server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel (optional)

1. Connect your repo to [Vercel](https://vercel.com)
2. Add your environment variables in the Vercel dashboard
3. Deploy — Vercel auto-detects Next.js and reads `vercel.json` for cron schedules

### 6. Set up Product Context

Product context tells Distill what your product already has so synthesis can focus on what's genuinely missing rather than re-surfacing shipped features.

1. Open your **product's codebase** in Claude Code (or any AI assistant)
2. Run the following prompt:

> Scan this codebase and generate a product context document for our feedback analysis tool. For each major feature area (pages, workflows, capabilities), list what's currently built vs what's missing or incomplete. Use this format:
>
> `## [Feature Area Name]`
> `- [Capability description] ✓` (if built and working)
> `- [Capability description] ✗` (if not yet built)
> `- [Capability description] ⚠` (if partially built or has known gaps)
>
> Focus on user-facing features: pages, workflows, integrations, and key capabilities. Skip internal infrastructure, dev tooling, and deployment details. Group by product area. Output as plain markdown.

3. Copy the output and paste it into **Settings > Product Context** in the Distill dashboard (`/dashboard/settings`)

**Keeping it updated:** Re-run the scan prompt against your codebase after each major release or sprint and paste the updated output. The product context doesn't need a date — Distill always uses the latest saved version. A good cadence is to update it whenever you ship features that would change what synthesis should flag.

## LLM Providers

Distill supports swappable LLM providers. Set `LLM_PROVIDER` in your environment to switch.

| Provider | `LLM_PROVIDER` | Required Env Vars | Notes |
|----------|----------------|-------------------|-------|
| **Anthropic** (default) | `anthropic` | `ANTHROPIC_API_KEY` | Claude Haiku for structuring, Sonnet for synthesis |
| **OpenAI** | `openai` | `OPENAI_API_KEY` | GPT-4o-mini for structuring, GPT-4o for synthesis |
| **Ollama** | `ollama` | `OLLAMA_BASE_URL` | Local models, no API key needed |

Model names are configurable per provider — see [`.env.example`](.env.example) for override variables.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing instructions, code conventions, and a guide for adding new LLM providers.

## Built With

This project was built with [VBW (Vibe Better With Claude Code)](https://github.com/swt-labs/vibe-better-with-claude-code-vbw) — an agentic development workflow for Claude Code.

## License

[AGPL-3.0](LICENSE)
