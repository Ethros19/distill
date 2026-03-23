# Tasks: Distill

**Spec**: `/specs/001-distill/spec.md`
**Decisions**: `/specs/001-distill/decisions.md`
**Plan**: `/specs/001-distill/plan.md`

## P1 — Capture feedback from any channel

### Acceptance Scenario 1: Email intake creates structured record

- [ ] [Impl] Initialize repo with `create-next-app` (App Router, TypeScript), configure `vercel.json` with cron jobs
- [ ] [Impl] Set up Vercel Postgres — configure Prisma or Drizzle ORM with the database schema for `inputs`, `signals`, `syntheses`, and `sessions` tables per plan data model
- [ ] [Impl] Run initial database migration to create all tables
- [ ] [Impl] Build `src/lib/structurer.ts` — LLM provider interface + default Anthropic implementation. Takes raw text, returns structured JSON.
- [ ] [Impl] Build `src/app/api/intake/email/route.ts` — Resend inbound webhook handler that verifies webhook signature, parses email payload (sender, subject, text body), computes content_hash, checks for duplicates, calls structurer, stores record in database
- [ ] [Verify] Integration test: mock Resend webhook payload → verify database record created with all required fields (source="email", correct contributor, summary, themes, urgency, confidence, status="processed")
- [ ] [Verify] Test: duplicate email (same content_hash) is rejected without creating a second record

### Acceptance Scenario 2: Manual paste creates structured record

- [ ] [Impl] Build POST `/api/intake` route — accepts `{ raw_content, source?, contributor? }`, calls structurer, stores in database, returns structured record as JSON
- [ ] [Impl] Build dashboard intake form page (`src/app/dashboard/intake/page.tsx`) — textarea + optional source/contributor fields + submit button
- [ ] [Verify] Integration test: POST to `/api/intake` with raw text → verify 200 response with structured record, verify database record exists
- [ ] [Verify] Test: response time < 30 seconds for a 500-word input

### Acceptance Scenario 3: Daily cron catches unprocessed inputs

- [ ] [Impl] Configure daily cron job in `vercel.json` pointing to `/api/cron/daily`
- [ ] [Impl] Build `src/app/api/cron/daily/route.ts` — verifies cron secret header, queries `inputs WHERE status = 'unprocessed'`, runs structurer on each, updates status
- [ ] [Verify] Unit test: seed database with 3 unprocessed inputs, call cron handler, verify all become status="processed"

## P2 — Weekly synthesis and email digest

### Acceptance Scenario 1: Weekly synthesis clusters inputs into signals

- [ ] [Impl] Build `src/lib/synthesizer.ts` — LLM provider interface + default Anthropic implementation. Takes structured inputs array, returns named signals with statement, reasoning, evidence, suggested_action, themes.
- [ ] [Impl] Configure weekly cron job in `vercel.json` pointing to `/api/cron/weekly`
- [ ] [Impl] Build `src/app/api/cron/weekly/route.ts` — verifies cron secret header, queries structured inputs from configured period, calls synthesizer, stores signals + synthesis record
- [ ] [Verify] Integration test: seed 10+ structured inputs with overlapping themes, trigger synthesis, verify signals created with correct evidence links and theme tags

### Acceptance Scenario 2: Digest email sent and Markdown saved

- [ ] [Impl] Build `src/lib/digest.ts` — renders synthesis into Markdown. Save to Vercel Blob.
- [ ] [Impl] Integrate Resend for email sending — send digest to recipient list from env var `DIGEST_RECIPIENTS`
- [ ] [Verify] Unit test: given a synthesis record with 3 signals, verify Markdown output contains all signal statements, evidence, and actions
- [ ] [Verify] Test: verify Resend send is called with correct recipients and Markdown body

### Acceptance Scenario 3: No digest on empty week

- [ ] [Impl] Add guard in weekly synthesis handler — if zero inputs in period, skip synthesis and email
- [ ] [Verify] Unit test: zero inputs for past 7 days, fire weekly cron, verify no synthesis record created and no email sent

## P3 — Dashboard for on-demand viewing and manual synthesis

### Acceptance Scenario 1: Password authentication

- [ ] [Impl] Build `src/lib/auth.ts` — POST `/api/auth` accepts `{ password }`, validates against `SIGNAL_PASSWORD` env var, creates session token, sets `HttpOnly` cookie
- [ ] [Impl] Build auth middleware (`src/middleware.ts`) — checks session cookie on all protected routes. Returns 401 if invalid/expired
- [ ] [Impl] Build login page (`src/app/page.tsx`) — password input + submit, redirects to `/dashboard` on success
- [ ] [Verify] Integration test: unauthenticated request returns 401; after correct password, subsequent request succeeds
- [ ] [Verify] Test: expired session token returns 401

### Acceptance Scenario 2: Dashboard displays current synthesis

- [ ] [Impl] Build dashboard main page (`src/app/dashboard/page.tsx`) — fetches `/api/synthesis/latest` on load (or uses Server Component data fetching), renders signals with statement, reasoning, evidence, and suggested actions
- [ ] [Impl] Build GET `/api/synthesis/latest` — returns most recent synthesis with its signals
- [ ] [Verify] E2E test: authenticated request to `/dashboard` returns page with synthesis data rendered

### Acceptance Scenario 3: Manual synthesis trigger

- [ ] [Impl] Build POST `/api/synthesis/trigger` — runs synthesis for current period, stores results, returns new synthesis
- [ ] [Impl] Add "Run Synthesis Now" button to dashboard — calls trigger endpoint, refreshes view on completion, shows loading state
- [ ] [Verify] Integration test: POST to `/api/synthesis/trigger` creates new synthesis record and returns signals

## P4 — Theme exploration across time

### Acceptance Scenario 1: Theme sidebar

- [ ] [Impl] Build GET `/api/themes` — aggregates themes with counts using PostgreSQL JSONB queries, returns sorted by frequency
- [ ] [Impl] Add theme sidebar to dashboard layout — clickable list with occurrence counts
- [ ] [Verify] Integration test: seed inputs with known themes, verify `/api/themes` returns correct theme names and counts

### Acceptance Scenario 2: Theme drill-down with time span

- [ ] [Impl] Build GET `/api/themes/:name?span=7d|30d|90d|all` — queries inputs matching theme within time span using JSONB contains operator, runs focused synthesis via LLM
- [ ] [Impl] Build theme detail page (`src/app/dashboard/themes/[name]/page.tsx`) — theme name, time span selector, synthesis results
- [ ] [Verify] Integration test: seed inputs with "pricing" theme across 60 days, query with `span=30d`, verify only last 30 days included

## Open-Source Release (Phase 3)

- [ ] [Impl] Write README.md — what it does, architecture diagram, 5-minute deploy guide, screenshot/demo GIF
- [ ] [Impl] Write CONTRIBUTING.md — local setup, PR guidelines, code of conduct link
- [ ] [Impl] Create `.env.example` with all required variables documented (POSTGRES_URL, RESEND_API_KEY, ANTHROPIC_API_KEY, SIGNAL_PASSWORD, DIGEST_RECIPIENTS, CRON_SECRET, etc.)
- [ ] [Impl] Add LICENSE file (Apache 2.0)
- [ ] [Impl] Build `src/lib/providers/` — LLM provider interface with Anthropic (default), OpenAI, and Ollama adapters
- [ ] [Impl] Verify all hardcoded values are configurable via environment variables
- [ ] [Verify] Fresh clone test: new machine, `git clone` → `cp .env.example .env.local` → fill in keys → `npm install` → `npx next dev` → working in < 5 minutes

## Final Verification

- [ ] Verify all acceptance scenarios pass (P1-S1 through P4-S2)
- [ ] Verify local dev works end-to-end with `next dev`
- [ ] Verify deployment succeeds to Vercel (staging/preview environment)
- [ ] Verify email intake end-to-end: forward real email to Resend address, confirm structured record appears
- [ ] Verify weekly digest end-to-end: trigger synthesis, confirm email received via Resend and Markdown saved to Vercel Blob
- [ ] Verify fresh contributor setup: clone, configure, run in < 5 minutes
