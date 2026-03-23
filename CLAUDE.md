# Distill — Signals Synthesis & Intelligence

Open-source signal intelligence system for product teams. Self-hosted web app.

## Stack (proposed, pending Phase 0)
- Cloudflare Workers (TypeScript)
- Cloudflare D1 (SQLite)
- Cloudflare R2 (file storage)
- Anthropic Claude API (default LLM, swappable)

## Structure
- `src/` — application source code
- `specs/` — feature specifications (Speckit format)
- `migrations/` — D1 database migrations
- `tests/` — test files
- `docs/` — documentation
- `scripts/` — utility scripts

## Rules
- Never commit .env or .dev.vars
- All config via environment variables — zero hardcoded secrets
- LLM provider must be swappable — core logic is provider-agnostic
- Cloudflare-specific code isolated to adapter layer
- Apache 2.0 license
