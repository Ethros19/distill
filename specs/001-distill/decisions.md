# Decisions: Distill

**Feature Branch**: `001-distill`
**Created**: 2026-03-23

## ADR-001: Cloudflare-Native Stack vs. Traditional Server

**Status**: Proposed (pending Phase 0 exploration)
**Date**: 2026-03-23

### Context

The Signal Intelligence System needs: HTTP endpoints (dashboard + API), scheduled jobs (daily/weekly crons), email intake processing, a database, and file storage. The initial deployer (Piper team) already uses Cloudflare, but as an open-source project, the stack choice affects contributor experience and portability. The target audience is small teams (2–5 people) with no dedicated DevOps capacity.

Phase 0 will validate this decision by building a proof-of-concept on each leading option.

### Options Considered

1. **Cloudflare-native stack**: Workers (compute) + D1 (database) + R2 (file storage) + Email Workers (intake) + Cron Triggers (scheduling) + Pages or Workers Sites (dashboard UI). Possibly using the [Cloudflare Agents SDK](https://github.com/cloudflare/agents) for stateful synthesis agents.
2. **Traditional server**: Node.js on a VPS (e.g., Railway, Fly.io, DigitalOcean) + SQLite or PostgreSQL + S3-compatible storage + SMTP relay for email intake + cron jobs via OS scheduler.
3. **Hybrid**: Core logic as portable TypeScript modules, with thin adapter layers for Cloudflare (primary) and Node.js/Docker (alternative). Contributors choose their runtime.

### Decision

**To be confirmed after Phase 0.** Current lean is toward **Option 1 (Cloudflare-native)** or **Option 3 (Hybrid)** because:

- **Zero server management**: Workers are serverless — no patching, scaling, or uptime monitoring
- **Email intake is native**: Cloudflare Email Routing → Email Worker is a first-class feature
- **Cost**: At projected volumes, the entire infrastructure falls within Cloudflare's free or low-cost tiers
- **Open-source friendly**: `wrangler.toml` + D1 migrations are declarative — contributors can `npx wrangler dev` locally
- **Agents SDK**: The [cloudflare/agents](https://github.com/cloudflare/agents) SDK provides stateful Durable Objects with built-in scheduling, which could simplify the synthesis agent. Includes [Anthropic patterns guide](https://github.com/cloudflare/agents/blob/main/guides/anthropic-patterns/README.md)

Phase 0 will evaluate:
- Whether the Cloudflare Agents SDK is mature enough vs. raw Workers + Cron Triggers
- Whether D1 limitations (SQLite, no full-text search) are acceptable or if we need an alternative
- Whether the 30-second CPU limit is a blocker for synthesis workloads
- Whether a portable adapter layer is worth the complexity for open-source contributors who don't use Cloudflare
- What CloudPulse (similar project) got right and wrong

### Consequences

**Positive (if Cloudflare-native):**
- No server maintenance or scaling concerns
- Sub-$5/month infrastructure cost at projected volumes
- Email intake works out of the box
- Local development via `wrangler dev` is straightforward
- Deployment is a single `wrangler deploy` command

**Negative (if Cloudflare-native):**
- Workers have a 30-second CPU time limit (paid plan) — synthesis may need chunking or Durable Objects
- D1 is SQLite-based — limited query operators; theme queries may need application-level filtering
- Cloudflare lock-in for email routing — may limit contributors on other platforms
- Dashboard UI must be static assets or server-rendered in Workers — no SSR frameworks
