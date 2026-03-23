# Feature Spec: Distill

**Feature Branch**: `001-distill`
**Created**: 2026-03-23
**Input**: Specs/piper_signal_spec.md (v1 architectural spec)

> **Distill — Signals Synthesis & Intelligence**
> Open-source signal intelligence for product teams.

## Problem Statement

Small product teams receive feedback across fragmented channels — email, WhatsApp, iMessage, meeting notes, voice memos, Slack, internal notes. Synthesizing these into actionable patterns requires manual collation: re-reading raw messages, mentally grouping themes, and hoping nothing falls through the cracks. This cognitive overhead grows linearly with input volume and is unsustainable.

Teams need a system that automatically captures, structures, and synthesizes feedback into clear, evidence-backed signals — so they can spend time on judgment (what to build) instead of collation (what was said).

## Goals

- Eliminate manual collation of product feedback across channels
- Automatically structure raw inputs into normalized, searchable records
- Detect patterns across inputs and surface them as named signals with evidence
- Deliver a weekly synthesis digest via email without any manual trigger
- Provide a dashboard for on-demand synthesis, theme exploration, and time-filtered analysis
- Keep the system simple enough for a small team (2–5 people) to self-host
- Be open-source from day one — easy to fork, configure, and deploy to your own infrastructure
- Self-hosted only — Distill is software you deploy, not a service you sign up for. Users own their data entirely.

## Non-goals

- Building a feedback voting board or feature request tracker
- CRM functionality or customer relationship management
- Real-time chat or collaboration features (future: conversation/comment layer)
- Hosted SaaS — Distill is self-hosted only. No multi-tenant service, no shared infrastructure, no user data on our servers
- Integrations with Slack, Notion, or other platforms (future iterations)
- Mobile app or native clients
- AI making product decisions — agent handles collation/synthesis, humans retain judgment

## Primary User Flow (Happy Path)

1. Team member receives feedback (email, WhatsApp, meeting, etc.)
2. Team member forwards it to a configured intake email address or pastes it into the dashboard form
3. System immediately structures the input (summary, themes, urgency, source type)
4. Weekly at a configured time, the synthesis agent clusters all recent structured inputs into signals
5. Team receives a digest email with top 3–5 signals, each with statement, evidence, and suggested action
6. Team member opens the dashboard to explore the current week's synthesis
7. Team member clicks a theme in the sidebar to see that theme's signals across a chosen time span

## User Stories (prioritized)

### P1 — Capture feedback from any channel

As a product team member, I want to forward or paste feedback from any source into one place so that nothing gets lost and I don't have to manually organize it.

**Acceptance Scenarios**:
1. **Given** a team member has feedback in an email thread, **When** they forward it to the configured intake email address, **Then** the system creates a structured record within 60 seconds containing: source (email), contributor, timestamp, raw content, AI-generated summary, extracted themes, and urgency score.
2. **Given** a team member has feedback from a non-email source (WhatsApp, meeting notes, voice memo transcript), **When** they paste the raw text into the dashboard intake form and submit, **Then** the system creates the same structured record within 30 seconds.
3. **Given** the daily catch-all cron runs, **When** there are unprocessed inputs from the previous 24 hours, **Then** all are structured and marked as processed (catch-all for any failed event-driven processing).

### P2 — Weekly synthesis and email digest

As a product team member, I want to receive a weekly email summarizing the top signals so I can understand patterns without reading raw messages.

**Acceptance Scenarios**:
1. **Given** the weekly synthesis cron fires, **When** there are 1 or more structured inputs from the past 7 days, **Then** the system clusters them into signals and generates a digest containing: top 3–5 signals, each with a statement, reasoning, supporting evidence (linked to source inputs), and a suggested action.
2. **Given** the weekly digest is generated, **When** it completes, **Then** an email is sent to all configured recipients AND the digest is saved as a Markdown file to the configured output location.
3. **Given** there are zero new inputs in the past 7 days, **When** the weekly cron fires, **Then** no digest is generated and no email is sent.

### P3 — Dashboard for on-demand viewing and manual synthesis

As a product team member, I want a web dashboard where I can view the latest synthesis and trigger a new one on demand so I don't have to wait for the weekly email.

**Acceptance Scenarios**:
1. **Given** a team member navigates to the dashboard URL, **When** they are not authenticated, **Then** they see a password prompt. After entering the correct password, they are granted a session (cookie-based) and see the current week's synthesis.
2. **Given** an authenticated team member is on the dashboard, **When** they view the default page, **Then** they see the most recent weekly synthesis with all signals, evidence, and suggested actions.
3. **Given** an authenticated team member clicks "Run Synthesis Now", **When** the synthesis completes, **Then** the dashboard updates with the new results and the results are also saved as a Markdown file.

### P4 — Theme exploration across time

As a product team member, I want to explore specific themes across different time spans so I can understand how signals evolve and investigate specific areas like pricing feedback.

**Acceptance Scenarios**:
1. **Given** the system has processed inputs over multiple weeks, **When** a team member views the dashboard, **Then** a sidebar displays a list of all detected themes ranked by frequency/recency.
2. **Given** a team member clicks a theme (e.g., "Pricing"), **When** they select a time span (this week, last month, all time), **Then** the dashboard shows a synthesis of that theme's signals within the selected period, with supporting evidence.

## Requirements

### Functional

- **FR-001**: Email intake via Resend inbound webhook (POST to Next.js API route)
- **FR-002**: Manual paste intake via authenticated web form on the dashboard
- **FR-003**: Each input is structured into: id, timestamp, source, contributor, raw content, AI-generated summary, type, themes (array), urgency (1–5), confidence (0–1)
- **FR-004**: Daily cron processes any unstructured inputs (catch-all)
- **FR-005**: Weekly synthesis clusters structured inputs into named signals with statement, reasoning, evidence, and suggested action
- **FR-006**: Weekly digest email sent to configured recipient list
- **FR-007**: Weekly digest saved as Markdown file to a configurable output path
- **FR-008**: Dashboard default view shows current week's synthesis
- **FR-009**: Dashboard supports manual synthesis trigger
- **FR-010**: Dashboard displays a themes sidebar populated from all detected themes
- **FR-011**: Theme drill-down supports time span filtering (this week, last 30 days, last 90 days, all time)
- **FR-012**: Password-based authentication with session cookie

### Non-functional

- **NFR-001**: Intake structuring completes in < 60 seconds for email, < 30 seconds for paste
- **NFR-002**: Weekly synthesis completes in < 5 minutes for up to 200 inputs
- **NFR-003**: Dashboard page load < 2 seconds
- **NFR-004**: System handles up to 50 inputs/day without degradation
- **NFR-005**: All data stored in Vercel Postgres (Neon) — managed PostgreSQL, no self-hosted database dependencies
- **NFR-006**: LLM API costs kept under $30/month at projected volume (< 50 inputs/day)
- **NFR-007**: Fully configurable via environment variables — zero hardcoded secrets, URLs, or team-specific values

### Open-source

- **OS-001**: Apache 2.0 license (allows future commercial hosted tier without restricting community adoption)
- **OS-002**: README with: what it does, quick demo GIF/screenshot, 5-minute deploy guide, architecture diagram
- **OS-003**: `.env.example` with all required variables documented
- **OS-004**: `CONTRIBUTING.md` with setup instructions, PR guidelines, and code of conduct
- **OS-005**: LLM provider is swappable — default to Anthropic Claude, but structurer/synthesizer accept a provider interface so contributors can plug in OpenAI, Ollama, etc.
- **OS-006**: All configuration (email address, cron schedule, recipients, LLM model, auth password) via environment variables or a single config file
- **OS-007**: `next dev` gets a contributor from zero to running locally in < 5 minutes
- **OS-008**: No vendor-specific code in core logic — Vercel/Postgres-specific code isolated to adapter layer

## Edge Cases

- Email with no body text (only attachments or subject line) — extract what's available, flag as low-confidence
- Duplicate forwarded email (same message forwarded twice) — deduplicate by content hash
- Very long input (> 10,000 words, e.g., full meeting transcript) — truncate to LLM context limits with a note, or chunk and summarize
- Synthesis with only 1 input in a week — still generate a digest but note low confidence, no clustering possible
- Email from unknown sender (not a team member) — still process, tag contributor as "unknown"
- Dashboard accessed while synthesis is running — show previous synthesis with a "synthesis in progress" indicator

## Success Criteria (measurable)

- **SC-001**: Zero manual collation required — all raw inputs are auto-structured within 24 hours
- **SC-002**: Weekly digest email arrives on schedule with actionable signals
- **SC-003**: Team members check raw messages < 1x/week (down from daily), relying on synthesis instead
- **SC-004**: System processes inputs from at least 3 different source types within first month
- **SC-005**: At least one product decision per month is informed by a signal from the system
- **SC-006**: A new contributor can clone the repo and run it locally in < 5 minutes (open-source goal)
- **SC-007**: At least 1 external contributor submits a PR within 3 months of public release

## Assumptions

- A configurable email address can be routed to the intake handler via Resend inbound webhook
- Claude API (claude-sonnet-4-6 or equivalent) is sufficient for both structuring and synthesis tasks; other LLM providers can be swapped in
- The deploying team will forward feedback consistently enough to generate meaningful weekly signals
- Markdown file output is written to Vercel Blob storage or included as an email attachment — not a local filesystem (serverless assumption)
- Weekly synthesis covers the prior 7 days by default; schedule is configurable
- The deployer has a Vercel account and can provision Vercel Postgres (Neon) and Vercel Blob

## Open Questions

- (None blocking — name finalized as "Distill")
