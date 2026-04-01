# Distill -- User Guide

## How It Works

Distill collects product feedback and industry intelligence, structures it with AI, and synthesizes recurring patterns into actionable signals. Here's the flow:

1. **Feedback comes in** via email, paste, or RSS feeds
2. **AI structures it** -- extracts summary, type, themes, urgency, and domain stream
3. **Daily synthesis** clusters inputs into signals (recurring patterns with evidence)
4. **You get a digest email** with signals, evidence, and suggested actions
5. **Dashboard** shows everything in one place -- signals, streams, radar, themes, and raw inputs

---

## Sending Feedback

### Option 1: Email (Recommended)

Forward or send feedback to your configured inbound address (e.g., `signals@yourdomain.com`).

That's it. The email is received by Resend, forwarded to Distill's webhook, structured by AI, and stored. Works from any email client.

**What to send:**
- Customer emails or support tickets
- Slack messages (copy/paste into email)
- Sales call notes
- Feature requests
- Bug reports from users

**Tips:**
- Use a descriptive subject line -- it gets included in the analysis
- One piece of feedback per email works best
- The sender's email address is recorded as the contributor
- Duplicate content is automatically detected and skipped

### Option 2: Paste API

Send feedback programmatically:

```bash
curl -X POST https://your-app.vercel.app/api/intake/paste \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "content": "Customer X says the onboarding flow is confusing...",
    "source": "slack",
    "contributor": "jane@yourcompany.com"
  }'
```

Requires authentication (session cookie from login).

### Option 3: RSS Feeds

Add feeds in the **Sources** page (`/dashboard/sources`). Distill polls them on a configurable interval, ingests new articles, and structures them with AI. Feed inputs are tagged with a domain stream for cross-stream analysis.

To get started quickly, use the "Seed sample feeds" button on the Sources page to populate a set of default industry feeds.

---

## Viewing Results

### Dashboard

Go to your deployed URL and log in. The main dashboard shows:
- **Latest synthesis** -- date range, signal count, input count, unprocessed items
- **Quick stats** -- signals by status, total inputs, themes detected

### Signals

Browse all detected signals at `/dashboard/signals`. Filter by:
- **Synthesis period** -- which synthesis run to view
- **Status** -- new, acknowledged, in progress, resolved
- **Search** -- keyword search across signal statements

Each signal card shows strength (number of supporting inputs), themes, and status.

### Signal Detail

Click any signal to see the full detail page (`/dashboard/signals/[id]`):
- Statement and reasoning
- Suggested action
- Theme tags
- Supporting evidence (linked raw inputs, expandable)
- Notes field for team annotations
- Status controls to move through the lifecycle
- **Push to Linear** button (when Linear integration is configured)

### Intelligence Radar

The Radar page (`/dashboard/radar`) shows AI-synthesized intelligence briefs across 6 domain streams:
- **General AI** -- model releases, regulations, research
- **Product** -- direct product feedback signals
- **Event Tech** -- event technology platforms and competition
- **Event Industry** -- hospitality, venues, seasonal trends
- **VC/Investment** -- funding rounds, M&A, startup investments
- **Business Dev** -- AI applications in your vertical, business intelligence

Each stream card includes a synopsis and expandable article list. Cards are drag-to-reorder.

### Streams

The Streams page (`/dashboard/streams`) shows:
- **Synthesis Narrative** -- AI-generated markdown connecting internal signals with external industry intelligence, with sections for The Story, Industry Validation, Cross-Stream Patterns, and Watch For
- **Themes heatmap** -- visual overview of theme frequency
- **Per-stream panels** -- drill into individual streams at `/dashboard/streams/[stream]`

Text size is adjustable via S/M/L toggle on the narrative panel.

### Inputs

The Inputs page (`/dashboard/inputs`) is the raw data reference layer:
- Paginated list of all inputs (20 per page)
- Filter by processing status, domain stream, and keyword search
- Source health panel showing feed status and error counts
- Click any input to see its full content

### Sources

Manage RSS feed sources at `/dashboard/sources`:
- Add new feeds with URL, name, category, and polling interval
- Enable/disable individual feeds
- View health status, last polled time, and error messages
- See input count per source
- Trigger manual polls for individual feeds

### Themes

Click any theme tag anywhere in the app to see all signals associated with that theme at `/dashboard/themes/[theme]`. Filter by synthesis period.

### Settings

Configure product context at `/dashboard/settings`. This tells the LLM what features you've already shipped so synthesis focuses on what's genuinely missing.

---

## How Synthesis Works

- **Daily cron (6:30 AM UTC):** Retries structuring for any failed/unprocessed inputs, cleans expired sessions
- **Synthesis cron (7:00 AM UTC):** Polls RSS feeds, runs synthesis on all recent processed inputs, generates a cross-stream narrative, sends digest email
- **Manual trigger:** Hit "Run Synthesis" on the dashboard or `POST /api/synthesis` anytime

Synthesis requires at least 2 inputs with overlapping themes to produce a signal. Single one-off inputs won't generate signals on their own.

The synthesis also considers:
- **Prior signals** -- previously triaged signals (acknowledged, in progress, resolved) are not re-surfaced unless there's significant escalation
- **Product context** -- features you've marked as shipped are excluded from gap analysis
- **Industry context** -- RSS feed inputs enrich signal reasoning with market trends but don't count as direct evidence
- **Cross-stream patterns** -- when evidence spans multiple domain streams, signals highlight this as a broader trend

---

## Digest Email

A daily digest is sent to configured recipients (set via `DIGEST_RECIPIENTS` env var).

The digest includes:
- Date range covered
- Each signal with strength rating
- Evidence (which inputs support it)
- Suggested actions
- Theme tags

---

## For New Deployments

### Quick Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/Ethros19/distill.git
   cd distill && npm install
   ```

2. **Set up database** -- Create a Neon Postgres project at [neon.tech](https://neon.tech), copy the connection string

3. **Configure environment** -- Copy `.env.example` to `.env.local` and fill in:
   ```
   DATABASE_URL=           # Neon connection string (required)
   AUTH_PASSWORD_HASH=     # Bcrypt hash — run: npx tsx scripts/hash-password.ts your-password
   CRON_SECRET=            # Random string — run: openssl rand -hex 32
   ANTHROPIC_API_KEY=      # Your Anthropic API key (required for default provider)
   RESEND_API_KEY=         # Resend API key for email (required for email features)
   RESEND_WEBHOOK_SECRET=  # Webhook signing secret from Resend
   DIGEST_RECIPIENTS=      # Comma-separated emails for daily digest
   ```

4. **Run migrations**
   ```bash
   npx drizzle-kit push
   ```

5. **Run locally**
   ```bash
   npm run dev
   ```

6. **Deploy to Vercel**
   ```bash
   npx vercel deploy --prod
   ```
   Add env vars in Vercel dashboard or via `npx vercel env add`.

### Email Intake Setup (Resend)

1. Add a domain in [Resend](https://resend.com) (e.g., `signals.yourdomain.com`)
2. Set up an inbound webhook pointing to `https://your-app.vercel.app/api/webhooks/resend`
3. Copy the webhook signing secret to `RESEND_WEBHOOK_SECRET` env var
4. Set `RESEND_FROM_ADDRESS` to customize the digest sender

### Linear Integration (Optional)

1. Get your API key from Linear > Settings > API > Personal API keys
2. Find your team ID in the URL when viewing your team in Linear settings
3. Set `LINEAR_API_KEY` and `LINEAR_TEAM_ID` in your environment
4. A "Push to Linear" button will appear on signal detail pages

### MCP Server (Optional)

See [mcp-server/README.md](../mcp-server/README.md) for setup instructions to chat with your Distill data from Claude Desktop.

### Cron Jobs

Cron schedules are configured in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "30 6 * * *" },
    { "path": "/api/cron/synthesis", "schedule": "0 7 * * *" }
  ]
}
```

Edit the schedule and redeploy to change when jobs run.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `AUTH_PASSWORD_HASH` | Yes | Bcrypt hash of dashboard password (`npx tsx scripts/hash-password.ts`) |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint auth (`openssl rand -hex 32`) |
| `LLM_PROVIDER` | No | `anthropic` (default), `openai`, or `ollama` |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key (*required if using Anthropic) |
| `OPENAI_API_KEY` | No | OpenAI API key (required if `LLM_PROVIDER=openai`) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (default: `http://localhost:11434`) |
| `RESEND_API_KEY` | Yes | Resend API key for email intake + digest |
| `RESEND_WEBHOOK_SECRET` | Yes | Webhook signing secret from Resend |
| `RESEND_FROM_ADDRESS` | No | Digest sender address |
| `DIGEST_RECIPIENTS` | No | Comma-separated emails for digest delivery |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for digest archival |
| `LINEAR_API_KEY` | No | Linear API key for push-to-Linear |
| `LINEAR_TEAM_ID` | No | Linear team UUID for issue creation |

See `.env.example` for detailed descriptions and setup links for each variable.
