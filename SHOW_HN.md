# Show HN: Distill -- Open-source signal intelligence for product teams

**Title:** Show HN: Distill -- Open-source signal intelligence for product teams

**URL:** https://github.com/Ethros19/distill

**Body:**

Distill collects feedback from email, paste, URLs, RSS feeds, and Linear, structures it with AI, and synthesizes recurring patterns into actionable signals. Think of it as a self-hosted intelligence radar for your product.

I built this because I wanted a single place to see what's happening across customer feedback, industry news, and internal conversations -- without shipping my data to someone else's platform. Everything runs on your own infrastructure (Vercel + Neon Postgres).

How it works: inputs arrive from multiple sources, an LLM extracts structure (summary, themes, urgency, domain stream), a daily cron clusters inputs into signals, and a dashboard shows the patterns. You can swap the LLM provider (Anthropic, OpenAI, or Ollama for fully local), push signals to Linear, get digest emails via Resend, and chat with your data through an MCP server in Claude Desktop.

The whole thing was built across 310+ commits using Claude Code with an agentic development workflow (VBW). It's AGPL-3.0 licensed.

Repo: https://github.com/Ethros19/distill

---

## Posting checklist

- [ ] Create HN account at https://news.ycombinator.com if needed (create a few days early)
- [ ] Post Tuesday-Thursday, ~8-9am US Eastern for best visibility
- [ ] Submit at https://news.ycombinator.com/submit
- [ ] Title goes in "title" field, repo URL in "url" field
- [ ] Put the body text in "text" field (only if no URL -- HN is URL *or* text, not both)
- [ ] Since you're linking the repo URL, the body above is for reference -- HN will show the link directly
- [ ] Be ready to answer comments for the first few hours (engagement matters for ranking)

## Tips

- Don't ask anyone to upvote -- this gets posts flagged
- Reply to comments genuinely, especially critical ones
- If someone asks "how is this different from X" have a clear answer ready
- Technical questions about architecture will come -- the README covers most of this
