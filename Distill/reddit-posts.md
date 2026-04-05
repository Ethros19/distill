# Reddit Posts

---

## r/SideProject

**Title:** I built an open-source "intelligence radar" for product teams that turns scattered feedback into patterns

I kept losing signal in the noise. Customer feedback in Slack, feature requests in Linear, interesting articles bookmarked and forgotten, support tickets that all said the same thing but I never connected the dots. I wanted something like [WorldMonitor](https://www.worldmonitor.app/) but self-hosted and focused on my own product's feedback loop.

So I built [Distill](https://github.com/Ethros19/distill).

**What it does:**

You feed it inputs -- customer quotes, support tickets, article URLs, RSS feeds, Linear issues -- and AI structures each one (themes, urgency, type, domain stream). A daily synthesis clusters everything into "signals": recurring patterns backed by evidence, ranked by strength.

**A few things I've actually used it for:**

- Pasted a week of support tickets and sales call notes. Distill surfaced that 4 separate customers mentioned the same onboarding friction I hadn't connected manually.
- Set up streams for AI news, competitor moves, and product feedback. It polls 24+ RSS feeds and generates a daily intelligence brief per domain. Like a personalized morning briefing.
- Connected Linear so new issues and comments flow in as inputs. When I push a signal to Linear and someone closes the issue, the signal auto-resolves. Two-way sync.
- Paste an article URL and it fetches/extracts the content. If the site blocks bots, it falls back to letting you paste the text directly.

**How hard is it to set up?**

Easier than most self-hosted tools I've dealt with:

- Clone, `npm install`, free Neon Postgres database, one API key (Anthropic, OpenAI, or Ollama for free local inference)
- `npx drizzle-kit push && npm run dev` -- working instance
- Dashboard has a setup checklist that walks you through configuring streams and adding your first input
- Deploy to Vercel in ~5 minutes (handles cron jobs automatically)

Everything else (email intake via Resend, Linear integration, MCP server for Claude Desktop, digest emails) is optional and added when you're ready. The integrations page shows what's connected with inline setup steps.

**Stack:** Next.js, Neon Postgres, Vercel, Claude API (swappable). AGPL-3.0. ~300 commits across 4 milestones, built entirely with Claude Code.

[GitHub](https://github.com/Ethros19/distill)

---

## r/selfhosted

**Title:** Distill -- self-hosted signal intelligence that turns feedback, RSS feeds, and Linear issues into actionable patterns

I wanted a self-hosted alternative to tools like [WorldMonitor](https://www.worldmonitor.app/) -- something that collects information from multiple sources, uses AI to structure it, and surfaces recurring patterns without me having to manually connect the dots.

[Distill](https://github.com/Ethros19/distill) is what I built. AGPL-3.0, no hosted service, your data stays on your infra.

**How it works:**

1. **Collect** -- inputs arrive via paste, article URLs, email webhook (Resend), RSS feed polling, or Linear webhook events
2. **Structure** -- AI extracts summary, type, themes, urgency, and domain stream from each input
3. **Synthesize** -- daily cron clusters recent inputs into signals (recurring patterns with evidence)
4. **Deliver** -- dashboard, digest email, Linear issue creation, MCP server for Claude Desktop

**Setup requirements:**

| What | Difficulty |
|------|-----------|
| Neon Postgres (free tier works) | Sign up, copy connection string |
| LLM API key | Anthropic or OpenAI key, **or Ollama for fully local/free** |
| `npm install && npx drizzle-kit push && npm run dev` | Standard Node setup |

That's the minimum. Working instance in under 10 minutes.

**For Vercel deployment:**

`npx vercel deploy --prod` + 3 env vars. Vercel handles cron jobs for daily synthesis via `vercel.json`.

**Optional integrations (add when ready):**

- **Resend** -- email intake webhook + daily digest delivery to your team
- **Linear** -- push signals as issues, two-way status sync (issue closed in Linear -> signal resolves), ingest issues/comments/customer requests/project updates as inputs
- **MCP Server** -- chat with your signal data from Claude Desktop
- **AI provider switching** -- configure API keys from the UI, swap between Anthropic/OpenAI/Ollama without redeployment

The integrations page shows connection status for everything with step-by-step setup instructions inline for anything not yet configured.

**Stack:** Next.js 16 (App Router), Neon Postgres (Drizzle ORM), Vercel, Anthropic Claude (default, swappable to OpenAI or Ollama). Bcrypt auth, rate limiting, session rotation, CSRF protection.

**What it's not:** Not a SaaS. No accounts, no tracking, no hosted version. You run it, you own the data.

[GitHub](https://github.com/Ethros19/distill)

---

## r/ProductManagement

**Title:** I built a free tool that watches your feedback channels and surfaces recurring patterns you'd otherwise miss

Product feedback is everywhere -- support tickets, Slack, sales calls, Linear issues, industry articles -- and the recurring patterns hide in the volume. I kept finding myself saying "wait, three customers said this exact same thing?" weeks too late.

Inspired by [WorldMonitor](https://www.worldmonitor.app/), I built [Distill](https://github.com/Ethros19/distill) to automate the pattern-finding part.

**How I actually use it:**

**Catching feedback patterns early.** I paste customer quotes, support tickets, and sales call notes throughout the week. Distill structures each one (themes, urgency, type) and runs a daily synthesis. Last week it clustered 4 unrelated support tickets into one signal: "onboarding flow confusion around workspace setup." I hadn't connected those manually.

**Intelligence briefing across domains.** I configured streams for AI news, competitor activity, and direct product feedback. Distill polls RSS feeds, structures every article, and gives me a per-stream synopsis each morning. It's like a research analyst that reads everything and highlights what matters.

**Closing the loop with Linear.** Signals can be pushed to Linear as issues with one click. When someone resolves the issue in Linear, the signal auto-resolves in Distill. New Linear issues, comments, and customer requests also flow back in as inputs -- so your issue tracker becomes another feedback source.

**Quick article capture.** Read something relevant? Click "Add Source," paste the URL. It fetches and extracts the article. If the site blocks bots (most major publications do), you get a paste fallback to drop in the text directly.

**What it takes to set up:**

This is a self-hosted tool, not a SaaS. That said, setup is straightforward if you're comfortable with basic deployment:

- **5-10 minutes for a local instance:** Clone the repo, free Neon database, one AI API key (Anthropic, OpenAI, or free local Ollama), run two commands
- **Another 5 minutes for production:** Deploy to Vercel, add 3 environment variables, daily synthesis runs automatically
- **Dashboard onboarding:** First login shows a setup checklist -- configure your intelligence streams, describe your product for AI context, add your first input, optionally seed RSS feeds

Everything beyond the basics (email intake, Linear integration, digest emails to your team, AI provider switching from the UI) is optional and documented with inline setup guides on the integrations page.

**What it's not:** This won't replace your analytics tool or your customer interview process. It's for the unstructured stuff -- the feedback that's too scattered to track in a spreadsheet but too valuable to ignore. Think of it as a persistent listener that remembers everything and tells you when patterns emerge.

Free, open-source (AGPL-3.0), self-hosted. No vendor lock-in.

[GitHub](https://github.com/Ethros19/distill)
