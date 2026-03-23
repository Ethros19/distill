# Tasks: Distill

**Spec**: `/specs/001-piper-signal/spec.md`
**Decisions**: `/specs/001-piper-signal/decisions.md`
**Plan**: `/specs/001-piper-signal/plan.md`

## Phase 0 — Tech Stack Exploration

### 0A: Cloudflare Workers + D1 spike

- [ ] [Spike] Create a minimal Cloudflare Worker with a D1 binding — create a test table, insert a record, read it back. Verify `wrangler dev` works locally.
- [ ] [Spike] Add a Cron Trigger to the Worker — verify it fires on schedule, measure cold start latency.
- [ ] [Spike] Set up an Email Worker — configure a test email address via Cloudflare Email Routing, forward a real email, parse it in the Worker, store the result in D1.
- [ ] [Spike] Call the Claude API from inside a Worker — measure round-trip latency, check whether it fits within the 30s CPU time limit for a typical structuring call.
- [ ] [Doc] Write up findings: what worked, what didn't, latency numbers, any gotchas.

### 0B: Cloudflare Agents SDK evaluation

- [ ] [Spike] Clone cloudflare/agents-starter, get it running locally with `wrangler dev`.
- [ ] [Spike] Build a minimal stateful agent: receive an input, store it in agent state, run a scheduled task that reads all stored inputs and logs a summary.
- [ ] [Spike] Evaluate: stability, DX (developer experience), documentation quality, debugging story. Compare to raw Workers + Cron.
- [ ] [Doc] Write up recommendation: use Agents SDK or stick with raw Workers for v1?

### 0C: LLM structuring spike

- [ ] [Spike] Write a standalone TypeScript function: takes raw feedback text, returns structured JSON (summary, type, themes[], urgency 1–5, confidence 0–1).
- [ ] [Spike] Test with Claude Haiku — run against 20+ real-world feedback examples. Measure: latency, cost per call, output consistency.
- [ ] [Spike] Test with at least one alternative provider (OpenAI GPT-4o-mini or Ollama local) — same 20 examples. Compare quality and cost.
- [ ] [Spike] Define the LLM provider interface (TypeScript type/interface) based on what both providers need.
- [ ] [Doc] Write up: recommended model for structuring, cost projections, provider interface design.

### 0D: LLM synthesis spike

- [ ] [Spike] Write a standalone function: takes 10–20 structured inputs, returns clustered signals (statement, reasoning, evidence[], suggested_action, themes[]).
- [ ] [Spike] Test prompt engineering with Claude Sonnet — does it cluster reliably? Are themes consistent? Are evidence links accurate?
- [ ] [Spike] Test with 50+ inputs — does it work in one call? If not, test a batch-and-merge approach.
- [ ] [Doc] Write up: recommended model for synthesis, prompt strategy, batching approach, cost projections.

### 0E: CloudPulse review

- [ ] [Research] Read through CloudPulse source code (riyayadavrepo/CloudPulse). Note patterns worth adopting and limitations to avoid.
- [ ] [Doc] Write up findings: architecture patterns, data model choices, what to reuse vs. what to do differently.

### 0F: Decision checkpoint

- [ ] [Decision] Review all spike findings. Finalize ADR-001 — confirm or change the stack decision.
- [ ] [Decision] Decide: Agents SDK vs. raw Workers for synthesis agent.
- [ ] [Decision] Decide: portable adapter layer (Hybrid, Option 3) or Cloudflare-only for v1.
- [ ] [Doc] Update decisions.md with final ADR-001 status and rationale.
- [ ] [Doc] Update plan.md and tasks.md based on Phase 0 findings.

## P1 — Capture feedback from any channel

### Acceptance Scenario 1: Email intake creates structured record

- [ ] [Impl] Initialize repo with `wrangler init`, configure `wrangler.toml` with D1 binding, R2 binding, and email routing
- [ ] [Impl] Create D1 migration `0001_initial_schema.sql` with `inputs`, `signals`, `syntheses`, and `sessions` tables per plan data model
- [ ] [Impl] Build `src/structurer.ts` — LLM provider interface + default Anthropic implementation. Takes raw text, returns structured JSON.
- [ ] [Impl] Build `src/intake.ts` — email handler that parses RFC 5322 (sender, subject, text body), computes content_hash, checks for duplicates, calls structurer, stores record in database
- [ ] [Impl] Wire email handler in `src/worker.ts` as the `email` export
- [ ] [Verify] Integration test: mock email event → verify database record created with all required fields (source="email", correct contributor, summary, themes, urgency, confidence, status="processed")
- [ ] [Verify] Test: duplicate email (same content_hash) is rejected without creating a second record

### Acceptance Scenario 2: Manual paste creates structured record

- [ ] [Impl] Build POST `/api/intake` route — accepts `{ raw_content, source?, contributor? }`, calls structurer, stores in database, returns structured record as JSON
- [ ] [Impl] Build dashboard intake form page — textarea + optional source/contributor fields + submit button
- [ ] [Verify] Integration test: POST to `/api/intake` with raw text → verify 200 response with structured record, verify database record exists
- [ ] [Verify] Test: response time < 30 seconds for a 500-word input

### Acceptance Scenario 3: Daily cron catches unprocessed inputs

- [ ] [Impl] Configure daily cron trigger in `wrangler.toml`
- [ ] [Impl] Build scheduled handler — queries `inputs WHERE status = 'unprocessed'`, runs structurer on each, updates status
- [ ] [Verify] Unit test: seed database with 3 unprocessed inputs, fire scheduled event, verify all become status="processed"

## P2 — Weekly synthesis and email digest

### Acceptance Scenario 1: Weekly synthesis clusters inputs into signals

- [ ] [Impl] Build `src/synthesizer.ts` — LLM provider interface + default Anthropic implementation. Takes structured inputs array, returns named signals with statement, reasoning, evidence, suggested_action, themes.
- [ ] [Impl] Configure weekly cron trigger
- [ ] [Impl] Build weekly synthesis handler — queries structured inputs from configured period, calls synthesizer, stores signals + synthesis record
- [ ] [Verify] Integration test: seed 10+ structured inputs with overlapping themes, trigger synthesis, verify signals created with correct evidence links and theme tags

### Acceptance Scenario 2: Digest email sent and Markdown saved

- [ ] [Impl] Build `src/digest.ts` — renders synthesis into Markdown. Save to object storage.
- [ ] [Impl] Integrate email sending (configurable provider) — send digest to recipient list from env var `DIGEST_RECIPIENTS`
- [ ] [Verify] Unit test: given a synthesis record with 3 signals, verify Markdown output contains all signal statements, evidence, and actions
- [ ] [Verify] Test: verify email send is called with correct recipients and Markdown body

### Acceptance Scenario 3: No digest on empty week

- [ ] [Impl] Add guard in weekly synthesis handler — if zero inputs in period, skip synthesis and email
- [ ] [Verify] Unit test: zero inputs for past 7 days, fire weekly cron, verify no synthesis record created and no email sent

## P3 — Dashboard for on-demand viewing and manual synthesis

### Acceptance Scenario 1: Password authentication

- [ ] [Impl] Build `src/auth.ts` — POST `/api/auth` accepts `{ password }`, validates against `SIGNAL_PASSWORD` env var, creates session token, sets `HttpOnly` cookie
- [ ] [Impl] Build auth middleware — checks session cookie on all protected routes. Returns 401 if invalid/expired
- [ ] [Impl] Build login page — password input + submit, redirects to `/dashboard` on success
- [ ] [Verify] Integration test: unauthenticated request returns 401; after correct password, subsequent request succeeds
- [ ] [Verify] Test: expired session token returns 401

### Acceptance Scenario 2: Dashboard displays current synthesis

- [ ] [Impl] Build dashboard main page — fetches `/api/synthesis/latest` on load, renders signals with statement, reasoning, evidence, and suggested actions
- [ ] [Impl] Build GET `/api/synthesis/latest` — returns most recent synthesis with its signals
- [ ] [Verify] E2E test: authenticated request to `/dashboard` returns HTML with synthesis data rendered

### Acceptance Scenario 3: Manual synthesis trigger

- [ ] [Impl] Build POST `/api/synthesis/trigger` — runs synthesis for current period, stores results, returns new synthesis
- [ ] [Impl] Add "Run Synthesis Now" button to dashboard — calls trigger endpoint, refreshes view on completion, shows loading state
- [ ] [Verify] Integration test: POST to `/api/synthesis/trigger` creates new synthesis record and returns signals

## P4 — Theme exploration across time

### Acceptance Scenario 1: Theme sidebar

- [ ] [Impl] Build GET `/api/themes` — aggregates themes with counts, returns sorted by frequency
- [ ] [Impl] Add theme sidebar to dashboard layout — clickable list with occurrence counts
- [ ] [Verify] Integration test: seed inputs with known themes, verify `/api/themes` returns correct theme names and counts

### Acceptance Scenario 2: Theme drill-down with time span

- [ ] [Impl] Build GET `/api/themes/:name?span=7d|30d|90d|all` — queries inputs matching theme within time span, runs focused synthesis via LLM
- [ ] [Impl] Build theme detail page — theme name, time span selector, synthesis results
- [ ] [Verify] Integration test: seed inputs with "pricing" theme across 60 days, query with `span=30d`, verify only last 30 days included

## Open-Source Release (Phase 3)

- [ ] [Impl] Write README.md — what it does, architecture diagram, 5-minute deploy guide, screenshot/demo GIF
- [ ] [Impl] Write CONTRIBUTING.md — local setup, PR guidelines, code of conduct link
- [ ] [Impl] Create `.env.example` with all required variables documented
- [ ] [Impl] Add LICENSE file (Apache 2.0)
- [ ] [Impl] Build `src/providers/` — LLM provider interface with Anthropic (default), OpenAI, and Ollama adapters
- [ ] [Impl] Verify all hardcoded values are configurable via environment variables
- [ ] [Verify] Fresh clone test: new machine, `git clone` → `cp .env.example .env` → fill in keys → `npx wrangler dev` → working in < 5 minutes

## Final Verification

- [ ] Verify all acceptance scenarios pass (P1-S1 through P4-S2)
- [ ] Verify local dev works end-to-end with `wrangler dev` (or equivalent)
- [ ] Verify deployment succeeds to a staging environment
- [ ] Verify email intake end-to-end: send real email, confirm structured record appears
- [ ] Verify weekly digest end-to-end: trigger synthesis, confirm email received and Markdown saved
- [ ] Verify fresh contributor setup: clone, configure, run in < 5 minutes
