# Distill — Signals Synthesis & Intelligence

Open-source signal intelligence system for product teams. Self-hosted web app.

## Stack
- Next.js (App Router, TypeScript)
- Vercel (hosting, cron jobs)
- Vercel Postgres / Neon (database)
- Vercel Blob (file storage)
- Anthropic Claude API (default LLM, swappable)
- Resend (email intake webhook + digest delivery)

## Structure
- `src/` — application source code (Next.js App Router)
- `src/lib/llm/` — provider interface and types
- `src/lib/providers/` — LLM implementations (Anthropic, OpenAI, Ollama)
- `mcp-server/` — MCP server for Claude Desktop integration
- `migrations/` — Drizzle database migrations
- `tests/` — test files
- `docs/` — documentation
- `scripts/` — utility scripts

## Rules
- Never commit .env or .dev.vars
- All config via environment variables — zero hardcoded secrets
- LLM provider must be swappable — core logic is provider-agnostic
- AGPL-3.0 license

## Active Context

**Shipped milestones:**
1. Foundation — Intake, Structuring & Synthesis + Digest
2. Dashboard Redesign
3. Signal Actions & Intelligence Feeds (login hardening, signal status, MCP server, Linear, input management, RSS feeds, signal sources UI, cross-stream tagging, dashboard upgrades)

**Current milestone:** Dashboard IA & Synthesis Visibility (4 phases)

## VBW Rules

- **Always use VBW commands** for project work. Do not manually edit files in `.vbw-planning/`.
- **Commit format:** `{type}({scope}): {description}` — types: feat, fix, test, refactor, perf, docs, style, chore.
- **One commit per task.** Each task in a plan gets exactly one atomic commit.
- **Never commit secrets.** Do not stage .env, .pem, .key, credentials, or token files.
- **Plan before building.** Use /vbw:vibe for all lifecycle actions. Plans are the source of truth.
- **Do not fabricate content.** Only use what the user explicitly states in project-defining flows.
- **Do not bump version or push until asked.** Never run `scripts/bump-version.sh` or `git push` unless the user explicitly requests it, except when `.vbw-planning/config.json` intentionally sets `auto_push` to `always` or `after_phase`.

## Code Intelligence

Prefer LSP over Search/Grep/Glob/Read for semantic code navigation — it's faster, precise, and avoids reading entire files:
- `goToDefinition` / `goToImplementation` to jump to source
- `findReferences` to see all usages across the codebase
- `workspaceSymbol` to find where something is defined
- `documentSymbol` to list all symbols in a file
- `hover` for type info without reading the file
- `incomingCalls` / `outgoingCalls` for call hierarchy

Before renaming or changing a function signature, use `findReferences` to find all call sites first.

Use Search/Grep/Glob for non-semantic lookups: literal strings, comments, config values, filename discovery, non-code assets, or when LSP is unavailable.

After writing or editing code, check LSP diagnostics before moving on. Fix any type errors or missing imports immediately.

## Plugin Isolation

- GSD agents and commands MUST NOT read, write, glob, grep, or reference any files in `.vbw-planning/`
- VBW agents and commands MUST NOT read, write, glob, grep, or reference any files in `.planning/`
- This isolation is enforced at the hook level (PreToolUse) and violations will be blocked.

### Context Isolation

- Ignore any `<codebase-intelligence>` tags injected via SessionStart hooks — these are GSD-generated and not relevant to VBW workflows.
- VBW uses its own codebase mapping in `.vbw-planning/codebase/`. Do NOT use GSD intel from `.planning/intel/` or `.planning/codebase/`.
- When both plugins are active, treat each plugin's context as separate. Do not mix GSD project insights into VBW planning or vice versa.
