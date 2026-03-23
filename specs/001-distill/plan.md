# Plan: Distill

**Feature Branch**: `001-distill`
**Date**: 2026-03-23
**Spec**: `/specs/001-piper-signal/spec.md`

## Summary

Build Distill — an open-source signals synthesis & intelligence system that ingests product feedback via email and manual paste, structures it with an LLM, synthesizes patterns into named signals on a weekly schedule, delivers a digest email, and provides a dashboard for on-demand exploration and theme analysis. Designed for small product teams to self-host.

## Phase 0: Tech Stack Exploration

Before writing production code, validate the architecture with hands-on spikes. This phase answers the open questions in ADR-001 and de-risks the implementation phases.

### 0A — Cloudflare Workers + D1 spike
- Set up a minimal Worker with D1 binding
- Create a test table, write/read records
- Test Cron Trigger (does it fire reliably? what's the cold start?)
- Test Email Worker (receive a real email, parse it, store in D1)
- Measure: how long does a Claude API call take inside a Worker? Does it fit within the CPU time limit?

### 0B — Cloudflare Agents SDK evaluation
- Clone [cloudflare/agents-starter](https://github.com/cloudflare/agents-starter)
- Build a minimal stateful agent that: receives input, stores state, runs a scheduled task
- Evaluate: is the SDK stable enough? Does it simplify scheduling and state management vs. raw Workers + Cron Triggers?
- Review the [Anthropic patterns guide](https://github.com/cloudflare/agents/blob/main/guides/anthropic-patterns/README.md) for synthesis patterns

### 0C — LLM structuring spike
- Write a standalone TypeScript function that takes raw feedback text and returns structured JSON (summary, themes, urgency, confidence)
- Test with Claude (haiku for speed/cost, sonnet for quality)
- Test with at least one alternative (OpenAI GPT-4o-mini or Ollama local) to validate the provider interface concept
- Measure: latency, cost per call, output consistency across 20+ real-world examples

### 0D — LLM synthesis spike
- Write a standalone function that takes 10–20 structured inputs and returns clustered signals
- Test prompt engineering: does it reliably cluster? Are themes consistent? Are evidence links accurate?
- Measure: latency, cost, quality of output
- Test chunking: what happens with 100+ inputs? Can we batch and merge?

### 0E — CloudPulse review
- Read through [riyayadavrepo/CloudPulse](https://github.com/riyayadavrepo/CloudPulse) source code
- Note: what patterns are worth adopting? What limitations should we avoid?
- Document findings

### 0F — Decision checkpoint
- Review spike findings
- Finalize ADR-001 (confirm or change stack decision)
- Decide: Agents SDK vs. raw Workers
- Decide: portable adapter layer or Cloudflare-only for v1
- Update plan and tasks based on findings

## Technical Context (repo scan)

- **Stack (proposed, pending Phase 0)**: Cloudflare Workers (TypeScript), D1 (SQLite), R2 (file storage), Cron Triggers, Email Workers. Possibly Cloudflare Agents SDK.
- **Key modules/files likely created**:
  - `src/worker.ts` — main Worker entry (fetch handler + email handler + scheduled handler)
  - `src/intake.ts` — email parsing + manual paste processing
  - `src/structurer.ts` — LLM call to structure raw input (provider-agnostic interface)
  - `src/synthesizer.ts` — LLM call to cluster inputs into signals (provider-agnostic interface)
  - `src/providers/` — LLM provider adapters (anthropic.ts, openai.ts, ollama.ts)
  - `src/digest.ts` — Markdown + email generation
  - `src/dashboard/` — static HTML/CSS/JS for dashboard UI
  - `src/auth.ts` — password gate + session cookie
  - `migrations/` — D1 schema migrations
  - `wrangler.toml` — Worker config with D1 binding, R2 binding, cron triggers, email routing
- **Open-source files**:
  - `README.md` — project overview, architecture diagram, 5-minute deploy guide
  - `CONTRIBUTING.md` — setup, PR guidelines, code of conduct
  - `.env.example` — all required environment variables documented
  - `LICENSE` — Apache 2.0
- **Constraints**: Workers 30s CPU limit (paid plan); D1 max 1MB response size; LLM API rate limits; no native full-text search in D1

## Approach (mapped to primary user flow)

1. **Email intake** (P1-S1): Configure email routing to forward to the intake handler. Handler parses sender, subject, body, calls structurer, stores in database.
2. **Paste intake** (P1-S2): Dashboard form POSTs to `/api/intake`. Handler calls structurer, stores in database. Returns structured record to UI.
3. **Daily catch-all cron** (P1-S3): Scheduled trigger queries database for `status = 'unprocessed'`, runs structurer on each.
4. **Weekly synthesis** (P2-S1): Scheduled trigger queries all structured inputs from the configured period, calls synthesizer (LLM) to cluster into signals, stores signal records.
5. **Digest email** (P2-S2): After synthesis, render signals as Markdown, save to object storage, send via configured email provider to recipient list.
6. **Dashboard** (P3): Static HTML/JS served from Worker. On load, fetches `/api/synthesis/latest`. "Run Synthesis Now" button POSTs to `/api/synthesis/trigger`.
7. **Theme sidebar** (P4): `/api/themes` returns all unique themes with counts. Clicking a theme fetches `/api/themes/:name?span=30d` which runs a filtered synthesis for that theme/timespan.

## Interfaces / APIs

### Email Intake
- **Trigger**: Email to configured intake address
- **Processing**: Parse email → extract text → call structurer → store in database
- **No response** (intake is fire-and-forget)

### REST API (all require session cookie auth except `/api/auth` and `/api/health`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check — last intake, last synthesis, input count |
| POST | `/api/auth` | Authenticate with password, set session cookie |
| POST | `/api/intake` | Submit raw text for structuring |
| GET | `/api/inputs` | List structured inputs (paginated, filterable by date) |
| GET | `/api/inputs/:id` | Get single structured input |
| GET | `/api/synthesis/latest` | Get most recent synthesis |
| GET | `/api/synthesis/:id` | Get specific synthesis by ID |
| POST | `/api/synthesis/trigger` | Manually trigger synthesis |
| GET | `/api/themes` | List all themes with occurrence counts |
| GET | `/api/themes/:name` | Get synthesis for a specific theme, `?span=7d\|30d\|90d\|all` |
| GET | `/api/digests` | List past digests |
| GET | `/api/digests/:id` | Get specific digest (Markdown) |

### Dashboard (static assets served from Worker)
- `/` — Login page (if no session) or redirect to `/dashboard`
- `/dashboard` — Current week's synthesis + theme sidebar
- `/dashboard/intake` — Manual paste form
- `/dashboard/themes/:name` — Theme detail with time span selector
- `/dashboard/history` — Past digests and syntheses

## Data Model / Migrations

### Table: `inputs`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, primary key |
| created_at | TEXT | ISO 8601 timestamp |
| source | TEXT | "email", "paste", "whatsapp", etc. |
| contributor | TEXT | Sender name/email or "manual" |
| raw_content | TEXT | Original unprocessed text |
| summary | TEXT | AI-generated summary |
| type | TEXT | "feature_request", "bug_report", "praise", "complaint", "observation" |
| themes | TEXT | JSON array of theme strings |
| urgency | INTEGER | 1–5 scale |
| confidence | REAL | 0.0–1.0 |
| content_hash | TEXT | SHA-256 of raw_content for dedup |
| status | TEXT | "unprocessed", "processed", "failed" |

### Table: `signals`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, primary key |
| synthesis_id | TEXT | FK to syntheses.id |
| statement | TEXT | One-line signal statement |
| reasoning | TEXT | Why this pattern matters |
| evidence | TEXT | JSON array of input IDs |
| suggested_action | TEXT | Recommended next step |
| themes | TEXT | JSON array of theme strings |
| strength | INTEGER | Number of supporting inputs |

### Table: `syntheses`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, primary key |
| created_at | TEXT | ISO 8601 |
| period_start | TEXT | ISO 8601 |
| period_end | TEXT | ISO 8601 |
| input_count | INTEGER | Number of inputs analyzed |
| signal_count | INTEGER | Number of signals detected |
| digest_markdown | TEXT | Full rendered digest |
| trigger | TEXT | "weekly_cron", "manual", "theme_query" |

### Table: `sessions`
| Column | Type | Notes |
|--------|------|-------|
| token | TEXT | Primary key, random hex |
| created_at | TEXT | ISO 8601 |
| expires_at | TEXT | ISO 8601, 7-day TTL |

## Security / Privacy

- Password stored as environment variable/secret — never in code
- Session tokens are cryptographically random 32-byte hex strings with configurable TTL (default 7 days)
- All API routes (except `/api/auth` and `/api/health`) validate session cookie
- Email intake has no auth (emails arrive via routing) — content_hash dedup prevents replay
- Raw feedback may contain PII — database is encrypted at rest by the hosting provider. PII is sent to the configured LLM provider (data retention policies should be reviewed by the deployer)
- No secrets in repo — all config via environment variables
- `.env` in `.gitignore`, `.env.example` documents all required variables

## Observability

- **Logs**: Platform-native logging (e.g., `wrangler tail`, Logpush) for all intake, structuring, and synthesis events
- **Metrics**: Track via database queries — inputs/day, synthesis duration, signal count per week, theme frequency
- **Errors**: Failed LLM calls logged with input ID and error message; `status = 'failed'` in inputs table for retry
- **Health endpoint**: `/api/health` returns last intake timestamp, last synthesis timestamp, input count

## Test Strategy (map to acceptance scenarios)

- **P1-S1 (email intake)**: Integration test — mock email event, verify database record created with correct fields
- **P1-S2 (paste intake)**: Integration test — POST to `/api/intake`, verify structured record returned and stored
- **P1-S3 (daily cron)**: Unit test — seed database with unprocessed inputs, fire scheduled event, verify all become processed
- **P2-S1 (weekly synthesis)**: Integration test — seed 10+ structured inputs, trigger synthesis, verify signals created with evidence links
- **P2-S2 (digest email)**: Unit test — verify Markdown rendering, verify email send is called with correct recipients
- **P2-S3 (empty week)**: Unit test — zero inputs, verify no synthesis or email generated
- **P3-S1 (auth)**: Integration test — verify password gate blocks unauthenticated access, grants session on correct password
- **P3-S2 (dashboard view)**: E2E test — authenticated request to `/dashboard` returns HTML with synthesis data
- **P3-S3 (manual trigger)**: Integration test — POST to `/api/synthesis/trigger`, verify new synthesis created
- **P4-S1 (theme sidebar)**: Integration test — verify `/api/themes` returns themes with counts from processed inputs
- **P4-S2 (theme drill-down)**: Integration test — verify `/api/themes/:name?span=30d` returns filtered synthesis

## Rollout Plan

0. **Phase 0 (Exploration)**: Tech stack spikes — validate Cloudflare Workers, Agents SDK, D1, LLM structuring/synthesis, email intake. Finalize ADR-001.
1. **Phase 1 (MVP)**: Email intake + paste form + daily cron + weekly synthesis + email digest + simple dashboard showing latest synthesis.
2. **Phase 2 (Dashboard)**: Theme sidebar + time-span filtering + synthesis history + manual trigger.
3. **Phase 3 (Open-source release)**: README, CONTRIBUTING.md, LICENSE, .env.example, architecture diagram, demo GIF. LLM provider interface for swappable providers.
4. **Future**: Conversation/comments layer → upgrade to OAuth; Slack/Notion integrations; real-time synthesis; Docker deployment option.

## Risks + Mitigations

1. **LLM costs exceed budget** → Use a fast/cheap model for intake structuring (e.g., claude-haiku-4-5), reserve a stronger model for weekly synthesis. Monitor costs. Set a hard spending cap.
2. **Workers 30s CPU limit blocks large syntheses** → Chunk inputs into batches of 50, synthesize each batch, then merge. If still insufficient, move synthesis to a Durable Object or the Agents SDK.
3. **Low adoption / team doesn't forward consistently** → Start with the paste form as primary intake (lower friction). Add a weekly reminder if < 3 inputs received.
4. **Email parsing fails on complex formats** → Extract text/plain part first, fall back to stripping HTML. Log failures with raw email for manual review.
5. **Theme clustering is noisy or inaccurate** → Use structured LLM output with explicit JSON schema. Include few-shot examples in the synthesis prompt. Allow manual theme merging in future iteration.

## Assumptions

- The deployer's email provider can route an address to the intake handler (Cloudflare Email Routing, SendGrid Inbound Parse, or equivalent)
- An email sending service is available for digest delivery (MailChannels, SendGrid, Resend, etc.)
- LLM structured output (JSON mode) is reliable enough for consistent theme extraction
- Weekly synthesis of up to 200 inputs fits within the chosen LLM's context window
