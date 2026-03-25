# Distill — Instructions

## How It Works

Distill collects product feedback, structures it with AI, and synthesizes recurring patterns into actionable signals. Here's the flow:

1. **Feedback comes in** via email or paste
2. **AI structures it** — extracts summary, type, themes, urgency
3. **Weekly synthesis** clusters inputs into signals
4. **You get a digest email** with signals, evidence, and suggested actions
5. **Dashboard** shows everything in one place

---

## Sending Feedback

### Option 1: Email (Recommended)

Forward or send feedback to:

```
signals@yourdomain.com
```

That's it. The email is received by Resend, forwarded to Distill's webhook, structured by AI, and stored. Works from any email client.

**What to send:**
- Customer emails or support tickets
- Slack messages (copy/paste into email)
- Sales call notes
- Feature requests
- Bug reports from users

**Tips:**
- Use a descriptive subject line — it gets included in the analysis
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

---

## Viewing Results

### Dashboard

Go to your deployed dashboard URL and log in.

You'll see:
- **Latest synthesis** — date range, signal count, input count
- **Signal cards** — each pattern detected, with strength, reasoning, evidence, and suggested actions
- **Theme sidebar** — all detected themes with occurrence counts, click to drill down
- **Run Synthesis** button — trigger an on-demand synthesis anytime

### Digest Email

A weekly digest is sent every Monday at 9 AM UTC to configured recipients (set via `DIGEST_RECIPIENTS` env var).

The digest includes:
- Date range covered
- Each signal with strength rating
- Evidence (which inputs support it)
- Suggested actions
- Theme tags

---

## How Synthesis Works

- **Daily cron (6 AM UTC):** Catches any unprocessed inputs and structures them
- **Weekly cron (Monday 9 AM UTC):** Runs synthesis on all processed inputs from the past 7 days, clusters them into signals, sends digest email
- **Manual trigger:** Hit "Run Synthesis" on the dashboard or `POST /api/synthesis` anytime

Synthesis requires at least 2 inputs with overlapping themes to produce a signal. Single one-off inputs won't generate signals on their own.

---

## For New Deployments

### Quick Setup (5 minutes)

1. **Clone and install**
   ```bash
   git clone git@github.com:Ethros19/distill.git
   cd distill && npm install
   ```

2. **Set up database** — Create a Neon Postgres project at [neon.tech](https://neon.tech), copy the connection string

3. **Configure environment** — Copy `.env.example` to `.env` and fill in:
   ```
   DATABASE_URL=           # Neon connection string (required)
   AUTH_PASSWORD=           # Password for dashboard login (required)
   ANTHROPIC_API_KEY=       # Your Anthropic API key (required)
   RESEND_API_KEY=          # Resend API key for email (required for email features)
   CRON_SECRET=             # Random string for cron auth (required)
   DIGEST_RECIPIENTS=       # Comma-separated emails for weekly digest
   ```

4. **Run migrations**
   ```bash
   npx drizzle-kit push
   ```

5. **Deploy to Vercel**
   ```bash
   npx vercel deploy --prod
   ```
   Add env vars in Vercel dashboard or via `npx vercel env add`.

### Email Intake Setup (Resend)

1. Add a domain in [Resend](https://resend.com) (e.g., `signals.yourdomain.com`)
2. Set up an inbound webhook pointing to `https://your-app.vercel.app/api/webhooks/resend`
3. Copy the webhook signing secret to `RESEND_WEBHOOK_SECRET` env var
4. Set `RESEND_FROM_ADDRESS` to customize the digest sender (default: `Distill <distill@example.com>`)

### Cron Jobs

Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "0 6 * * *" },
    { "path": "/api/cron/weekly", "schedule": "0 9 * * 1" }
  ]
}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `AUTH_PASSWORD` | Yes | Dashboard login password |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key (*or use OpenAI/Ollama) |
| `LLM_PROVIDER` | No | `anthropic` (default), `openai`, or `ollama` |
| `RESEND_API_KEY` | Yes | Resend API key for email intake + digest |
| `RESEND_WEBHOOK_SECRET` | Yes | Webhook signing secret from Resend |
| `RESEND_FROM_ADDRESS` | No | Digest sender (default: `Distill <distill@example.com>`) |
| `DIGEST_RECIPIENTS` | No | Comma-separated emails for weekly digest |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint auth |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for digest archival |
