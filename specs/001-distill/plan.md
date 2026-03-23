# Plan: Distill

**Feature Branch**: `001-distill`
**Date**: 2026-03-23
**Spec**: `/specs/001-distill/spec.md`

## Summary

Build Distill — an open-source signals synthesis & intelligence system that ingests product feedback via email and manual paste, structures it with an LLM, synthesizes patterns into named signals on a weekly schedule, delivers a digest email, and provides a dashboard for on-demand exploration and theme analysis. Designed for small product teams to self-host.

## Technical Context (repo scan)

- **Stack**: Next.js App Router (TypeScript), Vercel Postgres/Neon (PostgreSQL), Vercel Blob (file storage), Vercel Cron Jobs (scheduling), Resend (email intake webhook + digest delivery).
- **Key modules/files likely created**:
  - `src/app/layout.tsx` — root layout with auth provider
  - `src/app/page.tsx` — login page (redirect to /dashboard if authenticated)
  - `src/app/dashboard/` — dashboard pages (App Router)
  - `src/app/api/intake/route.ts` — manual paste intake API route
  - `src/app/api/intake/email/route.ts` — Resend inbound webhook handler
  - `src/app/api/auth/route.ts` — password authentication
  - `src/app/api/synthesis/route.ts` — synthesis endpoints
  - `src/app/api/themes/route.ts` — themes endpoint
  - `src/app/api/health/route.ts` — health check
  - `src/app/api/cron/daily/route.ts` — daily catch-all cron handler
  - `src/app/api/cron/weekly/route.ts` — weekly synthesis cron handler
  - `src/lib/structurer.ts` — LLM call to structure raw input (provider-agnostic interface)
  - `src/lib/synthesizer.ts` — LLM call to cluster inputs into signals (provider-agnostic interface)
  - `src/lib/providers/` — LLM provider adapters (anthropic.ts, openai.ts, ollama.ts)
  - `src/lib/digest.ts` — Markdown + email generation via Resend
  - `src/lib/auth.ts` — password gate + session cookie
  - `src/lib/db.ts` — database client (Vercel Postgres / @vercel/postgres or Drizzle ORM)
  - `prisma/schema.prisma` or `src/lib/schema.ts` — database schema (Prisma or Drizzle)
  - `vercel.json` — cron job configuration
- **Open-source files**:
  - `README.md` — project overview, architecture diagram, 5-minute deploy guide
  - `CONTRIBUTING.md` — setup, PR guidelines, code of conduct
  - `.env.example` — all required environment variables documented
  - `LICENSE` — Apache 2.0
- **Constraints**: Vercel Serverless Function timeout (60s Hobby / 300s Pro); Vercel Postgres connection limits (Neon pooling); LLM API rate limits

## Approach (mapped to primary user flow)

1. **Email intake** (P1-S1): Configure Resend inbound webhook to POST to `/api/intake/email`. Handler parses sender, subject, body, calls structurer, stores in database.
2. **Paste intake** (P1-S2): Dashboard form POSTs to `/api/intake`. Handler calls structurer, stores in database. Returns structured record to UI.
3. **Daily catch-all cron** (P1-S3): Vercel Cron Job hits `/api/cron/daily`, queries database for `status = 'unprocessed'`, runs structurer on each.
4. **Weekly synthesis** (P2-S1): Vercel Cron Job hits `/api/cron/weekly`, queries all structured inputs from the configured period, calls synthesizer (LLM) to cluster into signals, stores signal records.
5. **Digest email** (P2-S2): After synthesis, render signals as Markdown, save to Vercel Blob, send via Resend to recipient list.
6. **Dashboard** (P3): Next.js App Router pages. On load, fetches `/api/synthesis/latest`. "Run Synthesis Now" button POSTs to `/api/synthesis/trigger`.
7. **Theme sidebar** (P4): `/api/themes` returns all unique themes with counts. Clicking a theme fetches `/api/themes/:name?span=30d` which runs a filtered synthesis for that theme/timespan.

## Interfaces / APIs

### Email Intake
- **Trigger**: Resend inbound webhook POSTs parsed email JSON to `/api/intake/email`
- **Processing**: Parse email payload → extract text → call structurer → store in database
- **Response**: 200 OK (Resend requires acknowledgment)

### REST API (all require session cookie auth except `/api/auth`, `/api/health`, and `/api/intake/email`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check — last intake, last synthesis, input count |
| POST | `/api/auth` | Authenticate with password, set session cookie |
| POST | `/api/intake` | Submit raw text for structuring |
| POST | `/api/intake/email` | Resend inbound webhook (verified by webhook signature) |
| GET | `/api/inputs` | List structured inputs (paginated, filterable by date) |
| GET | `/api/inputs/:id` | Get single structured input |
| GET | `/api/synthesis/latest` | Get most recent synthesis |
| GET | `/api/synthesis/:id` | Get specific synthesis by ID |
| POST | `/api/synthesis/trigger` | Manually trigger synthesis |
| GET | `/api/themes` | List all themes with occurrence counts |
| GET | `/api/themes/:name` | Get synthesis for a specific theme, `?span=7d\|30d\|90d\|all` |
| GET | `/api/digests` | List past digests |
| GET | `/api/digests/:id` | Get specific digest (Markdown) |

### Cron Jobs (Vercel Cron, configured in vercel.json)

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/cron/daily` | `0 6 * * *` | Process unstructured inputs (catch-all) |
| `/api/cron/weekly` | `0 9 * * 1` | Run weekly synthesis + send digest |

### Dashboard (Next.js App Router pages)
- `/` — Login page (if no session) or redirect to `/dashboard`
- `/dashboard` — Current week's synthesis + theme sidebar
- `/dashboard/intake` — Manual paste form
- `/dashboard/themes/:name` — Theme detail with time span selector
- `/dashboard/history` — Past digests and syntheses

## Data Model / Migrations

Uses Prisma or Drizzle ORM with Vercel Postgres (Neon). PostgreSQL types used throughout.

### Table: `inputs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, `gen_random_uuid()` |
| created_at | TIMESTAMPTZ | Default `now()` |
| source | VARCHAR(50) | "email", "paste", "whatsapp", etc. |
| contributor | TEXT | Sender name/email or "manual" |
| raw_content | TEXT | Original unprocessed text |
| summary | TEXT | AI-generated summary |
| type | VARCHAR(50) | "feature_request", "bug_report", "praise", "complaint", "observation" |
| themes | JSONB | Array of theme strings |
| urgency | SMALLINT | 1-5 scale |
| confidence | REAL | 0.0-1.0 |
| content_hash | VARCHAR(64) | SHA-256 of raw_content for dedup, unique index |
| status | VARCHAR(20) | "unprocessed", "processed", "failed" |

### Table: `signals`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, `gen_random_uuid()` |
| synthesis_id | UUID | FK to syntheses.id |
| statement | TEXT | One-line signal statement |
| reasoning | TEXT | Why this pattern matters |
| evidence | JSONB | Array of input IDs |
| suggested_action | TEXT | Recommended next step |
| themes | JSONB | Array of theme strings |
| strength | SMALLINT | Number of supporting inputs |

### Table: `syntheses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, `gen_random_uuid()` |
| created_at | TIMESTAMPTZ | Default `now()` |
| period_start | TIMESTAMPTZ | |
| period_end | TIMESTAMPTZ | |
| input_count | INTEGER | Number of inputs analyzed |
| signal_count | INTEGER | Number of signals detected |
| digest_markdown | TEXT | Full rendered digest |
| trigger | VARCHAR(20) | "weekly_cron", "manual", "theme_query" |

### Table: `sessions`
| Column | Type | Notes |
|--------|------|-------|
| token | VARCHAR(64) | Primary key, random hex |
| created_at | TIMESTAMPTZ | Default `now()` |
| expires_at | TIMESTAMPTZ | 7-day TTL |

## Security / Privacy

- Password stored as environment variable/secret — never in code
- Session tokens are cryptographically random 32-byte hex strings with configurable TTL (default 7 days)
- All API routes (except `/api/auth`, `/api/health`, and `/api/intake/email`) validate session cookie
- Resend inbound webhook verified by webhook signature (svix) — prevents spoofed requests
- Email intake content_hash dedup prevents replay
- Raw feedback may contain PII — database is encrypted at rest by Neon/Vercel Postgres. PII is sent to the configured LLM provider (data retention policies should be reviewed by the deployer)
- No secrets in repo — all config via environment variables
- `.env` in `.gitignore`, `.env.example` documents all required variables

## Observability

- **Logs**: Vercel Function Logs for all intake, structuring, and synthesis events. Vercel Log Drains for persistent logging if needed.
- **Metrics**: Track via database queries — inputs/day, synthesis duration, signal count per week, theme frequency
- **Errors**: Failed LLM calls logged with input ID and error message; `status = 'failed'` in inputs table for retry
- **Health endpoint**: `/api/health` returns last intake timestamp, last synthesis timestamp, input count

## Test Strategy (map to acceptance scenarios)

- **P1-S1 (email intake)**: Integration test — mock Resend webhook payload, verify database record created with correct fields
- **P1-S2 (paste intake)**: Integration test — POST to `/api/intake`, verify structured record returned and stored
- **P1-S3 (daily cron)**: Unit test — seed database with unprocessed inputs, call cron handler, verify all become processed
- **P2-S1 (weekly synthesis)**: Integration test — seed 10+ structured inputs, trigger synthesis, verify signals created with evidence links
- **P2-S2 (digest email)**: Unit test — verify Markdown rendering, verify Resend send is called with correct recipients
- **P2-S3 (empty week)**: Unit test — zero inputs, verify no synthesis or email generated
- **P3-S1 (auth)**: Integration test — verify password gate blocks unauthenticated access, grants session on correct password
- **P3-S2 (dashboard view)**: E2E test — authenticated request to `/dashboard` returns page with synthesis data
- **P3-S3 (manual trigger)**: Integration test — POST to `/api/synthesis/trigger`, verify new synthesis created
- **P4-S1 (theme sidebar)**: Integration test — verify `/api/themes` returns themes with counts from processed inputs
- **P4-S2 (theme drill-down)**: Integration test — verify `/api/themes/:name?span=30d` returns filtered synthesis

## Rollout Plan

1. **Phase 1 (MVP)**: Email intake (Resend webhook) + paste form + daily cron + weekly synthesis + email digest + simple dashboard showing latest synthesis.
2. **Phase 2 (Dashboard)**: Theme sidebar + time-span filtering + synthesis history + manual trigger.
3. **Phase 3 (Open-source release)**: README, CONTRIBUTING.md, LICENSE, .env.example, architecture diagram, demo GIF. LLM provider interface for swappable providers.
4. **Future**: Conversation/comments layer → upgrade to OAuth; Slack/Notion integrations; real-time synthesis; Docker deployment option.

## Risks + Mitigations

1. **LLM costs exceed budget** → Use a fast/cheap model for intake structuring (e.g., claude-haiku-4-5), reserve a stronger model for weekly synthesis. Monitor costs. Set a hard spending cap.
2. **Vercel function timeout for large syntheses** → At 60s (Hobby) or 300s (Pro), this is unlikely for typical volumes. If needed, chunk inputs into batches of 50, synthesize each batch, then merge.
3. **Low adoption / team doesn't forward consistently** → Start with the paste form as primary intake (lower friction). Add a weekly reminder if < 3 inputs received.
4. **Email parsing fails on complex formats** → Resend inbound webhook provides pre-parsed email (text, HTML, subject, from). Extract text/plain first, fall back to stripping HTML. Log failures with raw payload for review.
5. **Theme clustering is noisy or inaccurate** → Use structured LLM output with explicit JSON schema. Include few-shot examples in the synthesis prompt. Allow manual theme merging in future iteration.
6. **Vercel Postgres connection limits** → Neon has connection pooling built in. Use `@vercel/postgres` SDK which handles pooling. Monitor connection usage in Vercel dashboard.
7. **Resend webhook reliability** → Resend retries failed webhook deliveries. Daily catch-all cron ensures no inputs are lost even if webhook delivery is delayed.

## Assumptions

- The deployer has a Vercel account and can provision Vercel Postgres and Vercel Blob
- A Resend account is configured with the intake domain's MX records pointing to Resend for inbound email
- Resend is also used for outbound digest delivery (single email service for both directions)
- LLM structured output (JSON mode) is reliable enough for consistent theme extraction
- Weekly synthesis of up to 200 inputs fits within the chosen LLM's context window
