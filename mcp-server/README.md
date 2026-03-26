# Distill MCP Server

Chat with your Distill signals data from Claude Desktop. Provides read-only access to signals, themes, raw feedback inputs, and synthesis data through the Model Context Protocol.

## Prerequisites

- Node.js 18+ (required for global `fetch` support)
- A Distill database (Neon Postgres) with a `DATABASE_URL` connection string
- Claude Desktop (requires Claude Max subscription)

## Setup

### 1. Install and build

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Desktop

Add the following to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "distill": {
      "command": "node",
      "args": ["/absolute/path/to/distill/mcp-server/build/index.js"],
      "env": {
        "DATABASE_URL": "your-neon-connection-string"
      }
    }
  }
}
```

Replace `/absolute/path/to` with the actual path to your cloned repo, and provide your Neon Postgres connection string as the `DATABASE_URL`.

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop to pick up the new server configuration.

### 4. Verify

Ask Claude: **"Use the distill tools to show me my top signals"**

## Available Tools

| Tool | Description | Key Parameters |
|---|---|---|
| `get_signals` | List signals with optional filtering | `status`, `theme`, `min_strength`, `limit` |
| `get_signal_detail` | Get full signal details with supporting evidence (raw feedback inputs) | `id` (signal UUID) |
| `get_themes` | Get theme overview with signal counts | `include_signal_counts` |
| `search_inputs` | Keyword search across raw feedback | `keyword`, `source`, `limit` |
| `get_synthesis_summary` | Get latest synthesis overview with top signals | `include_digest`, `top_signals` |

## Security Note

The MCP server has **read-only** access to your database. All tools perform `SELECT` queries only — no data is created, modified, or deleted. Your `DATABASE_URL` is stored locally in your Claude Desktop config file and is never transmitted to Anthropic.

## Development

```bash
npm run dev    # Watch mode — recompiles on file changes
npm run build  # One-time build
```
