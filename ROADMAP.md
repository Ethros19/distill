# Roadmap

## Completed

### Phase 01: Login Security Hardening
Hardened the authentication system — bcrypt password hashing, login rate limiting, session rotation, and idle timeout.

### Phase 02: Signal Status & Detail Page
Added status lifecycle to signals (`new`, `acknowledged`, `in_progress`, `resolved`) with a dedicated signal detail page showing full evidence and status controls.

### Phase 03: MCP Server
Built a standalone MCP server (`mcp-server/`) that connects to the Neon database and exposes 5 read-only tools for chatting with signals data from Claude Desktop or Claude Code. No API costs — works with Claude Max subscription.

**Tools:** `get_signals`, `get_signal_detail`, `get_themes`, `search_inputs`, `get_synthesis_summary`

## Up Next

### Phase 04: Linear Integration
Add a "Push to Linear" button on the signal detail page that creates a Linear issue from a signal and auto-transitions it to `in_progress`. Stores the Linear issue URL back on the signal for cross-referencing.

- `LINEAR_API_KEY` and `LINEAR_TEAM_ID` configured via env vars
- Signal statement as issue title, reasoning + suggested action as description, themes as labels
- Gracefully hidden when Linear is not configured

### Phase 05: Slack Integration (2-way)
Bidirectional Slack integration — share signals outbound AND ingest messages from configured channels as raw inputs for synthesis.

- **Outbound:** "Share to Slack" button posts formatted Block Kit message with signal summary and deep link
- **Inbound:** Watch configured Slack channels and ingest messages as inputs for synthesis
- Channel allowlist — admin selects which channels to watch (not all channels)
- Gracefully hidden when Slack is not configured

### Phase 06: Discord Integration (2-way)
Bidirectional Discord integration — share signals outbound AND ingest messages from configured channels as raw inputs for synthesis.

- **Outbound:** "Share to Discord" button posts rich embed with signal summary and deep link
- **Inbound:** Watch configured Discord channels and ingest messages as inputs for synthesis
- Channel allowlist — admin selects which channels to watch (not all channels)
- Gracefully hidden when Discord is not configured

## Community Discussions

- [Hosting Provider Portability](https://github.com/Ethros19/distill/discussions/1) — RFC for supporting non-Vercel hosting (Cloudflare, Fly.io, self-hosted)
- [2-Way Slack Integration](https://github.com/Ethros19/distill/discussions/2) — Channel watching, inbound architecture, and filtering questions
- [2-Way Discord Integration](https://github.com/Ethros19/distill/discussions/3) — Bot vs. webhook, channel filtering, and dedup questions
