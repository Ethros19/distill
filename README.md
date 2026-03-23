# Distill

**Signals Synthesis & Intelligence**

Open-source signal intelligence for product teams. Distill captures feedback from any channel, structures it with AI, and synthesizes patterns into clear, evidence-backed signals — so you can focus on what to build, not what was said.

> **Status: Pre-alpha** — Architecture and tech stack exploration (Phase 0). Not yet functional.

## What it does

1. **Capture** — Forward emails or paste feedback from any source
2. **Structure** — AI automatically extracts summary, themes, urgency, and source type
3. **Synthesize** — Weekly (or on-demand), patterns are clustered into named signals with evidence
4. **Deliver** — Get a digest email and explore signals on a self-hosted dashboard

## Self-hosted

Distill is software you deploy to your own infrastructure. Your data stays on your servers. There is no hosted service.

## Architecture (proposed)

```
Email ──→ ┌─────────────┐     ┌─────────────┐     ┌──────────┐
          │   Intake     │────→│  Structurer  │────→│    D1    │
Paste ──→ │   Handler    │     │  (LLM call)  │     │ Database │
          └─────────────┘     └─────────────┘     └────┬─────┘
                                                       │
          ┌─────────────┐     ┌─────────────┐         │
          │   Digest     │←───│ Synthesizer  │←────────┘
          │ Email + MD   │     │  (LLM call)  │  Weekly cron
          └─────────────┘     └─────────────┘
                                    │
                              ┌─────┴─────┐
                              │ Dashboard  │
                              │  Web UI    │
                              └───────────┘
```

## Tech stack (under evaluation)

- **Runtime**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **LLM**: Anthropic Claude (default), with swappable provider interface
- **Email**: Cloudflare Email Routing (intake) + configurable sender (digest)

See [`specs/001-distill/`](specs/001-distill/) for the full specification.

## Project status

- [x] Specification complete
- [ ] Phase 0: Tech stack exploration
- [ ] Phase 1: MVP (intake + synthesis + digest)
- [ ] Phase 2: Dashboard (themes + manual trigger)
- [ ] Phase 3: Open-source release polish

## License

[Apache 2.0](LICENSE)

## Built by


