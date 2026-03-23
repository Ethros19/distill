# Decisions: Distill

**Feature Branch**: `001-distill`
**Created**: 2026-03-23

## ADR-001: Deployment Platform — Vercel (Next.js)

**Status**: Decided
**Date**: 2026-03-23

### Context

The Signal Intelligence System needs: HTTP endpoints (dashboard + API), scheduled jobs (daily/weekly crons), email intake processing, a database, and file storage. The initial deployer (Piper team) already uses Vercel for its main project (Piper). As an open-source project, the stack choice affects contributor experience and portability. The target audience is small teams (2-5 people) with no dedicated DevOps capacity.

### Options Considered

1. **Cloudflare-native stack**: Workers (compute) + D1 (database) + R2 (file storage) + Email Workers (intake) + Cron Triggers (scheduling) + Pages or Workers Sites (dashboard UI). Possibly using the [Cloudflare Agents SDK](https://github.com/cloudflare/agents) for stateful synthesis agents.
2. **Vercel + Next.js stack**: Next.js App Router (compute + UI) + Vercel Postgres/Neon (database) + Vercel Blob (file storage) + Resend inbound webhook (email intake) + Vercel Cron Jobs (scheduling).
3. **Traditional server**: Node.js on a VPS (e.g., Railway, Fly.io, DigitalOcean) + SQLite or PostgreSQL + S3-compatible storage + SMTP relay for email intake + cron jobs via OS scheduler.
4. **Hybrid**: Core logic as portable TypeScript modules, with thin adapter layers for multiple platforms. Contributors choose their runtime.

### Decision

**Option 2 — Vercel + Next.js.** Chosen over Cloudflare-native (Option 1) for the following reasons:

- **Already on Vercel**: The Piper team already uses Vercel for its main project — single platform means one bill, one dashboard, shared tooling knowledge
- **Postgres > SQLite for queries**: Vercel Postgres (Neon) provides full PostgreSQL — proper joins, full-text search, JSON operators, and richer query capabilities compared to D1/SQLite
- **Better dashboard DX with Next.js**: App Router provides server components, layouts, streaming, and a mature React ecosystem — no need to hand-build static HTML in a Worker
- **Longer function timeouts**: Vercel Serverless Functions have up to 60s on Hobby / 300s on Pro, vs. Workers' 30s CPU limit — no need to chunk synthesis into Durable Objects
- **Resend for email**: Resend inbound webhook is a clean API route handler, and Resend also handles digest delivery — one service for both inbound and outbound email
- **Mature ecosystem**: Next.js has broad contributor familiarity, extensive documentation, and a large plugin/middleware ecosystem

**Cloudflare was considered but rejected** because:
- Workers' 30s CPU limit would require complex chunking or Durable Objects for synthesis workloads
- D1 (SQLite) has limited query operators — theme queries and aggregations would need application-level filtering
- Email Workers require Cloudflare Email Routing setup — less portable for open-source contributors
- Dashboard UI would be static HTML or a custom SSR solution in Workers — significantly more effort than Next.js
- The team is not currently on Cloudflare, so it would mean managing a second platform

### Consequences

**Positive:**
- No server maintenance or scaling concerns — Vercel handles deployment and scaling
- Sub-$20/month infrastructure cost at projected volumes (Hobby plan + Postgres)
- Rich dashboard DX with Next.js App Router, React Server Components, and streaming
- Full PostgreSQL power for complex queries, aggregations, and theme analysis
- Local development via `next dev` is straightforward and well-documented
- Deployment is `git push` to main (Vercel auto-deploys) or `vercel deploy`
- Email intake and digest delivery both handled by Resend

**Negative:**
- Vercel lock-in for deployment (mitigated: Next.js can run on other hosts; core logic is provider-agnostic)
- Vercel Postgres is Neon under the hood — connection pooling and cold start behavior need monitoring
- Resend webhook requires configuring DNS (MX records) for the intake email domain
- Vercel Cron Jobs have a minimum interval of 1 minute and require vercel.json configuration
