export const recommendedFeeds: Array<{ name: string; url: string; category: string }> = [
  // AI Research & News Outlets
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'AI News' },
  { name: 'MIT Technology Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', category: 'AI Research' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'AI News' },
  { name: 'TLDR AI', url: 'https://tldr.tech/api/rss/ai', category: 'AI Digest' },
  { name: 'Import AI', url: 'https://importai.substack.com/feed', category: 'AI Research' },
  { name: 'The Rundown AI', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml', category: 'AI Digest' },
  { name: 'AI News Weekly', url: 'https://aiweekly.co/issues.rss', category: 'AI Digest' },

  // AI Business & Funding News
  { name: 'OpenAI News', url: 'https://openai.com/blog/rss.xml', category: 'LLM/Product' },
  { name: 'Anthropic News', url: 'https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml', category: 'LLM/Product' },
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', category: 'Funding' },
  { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/', category: 'Funding' },

  // Event Planning & Production Trade Publications
  { name: 'BizBash', url: 'https://www.bizbash.com/rss.xml', category: 'Events' },
  { name: 'Event Marketer', url: 'https://www.eventmarketer.com/feed/', category: 'Events' },
  { name: 'Special Events', url: 'https://www.specialevents.com/rss.xml', category: 'Events' },
  { name: 'PCMA', url: 'https://www.pcma.org/feed/', category: 'Events' },
  { name: 'Smart Meetings', url: 'https://www.smartmeetings.com/feed/', category: 'Meetings' },

  // Event Technology News
  { name: 'Event Industry News', url: 'https://www.eventindustrynews.com/feed', category: 'Event Tech' },
  { name: 'Event Tech Live', url: 'https://eventtechlive.com/feed/', category: 'Event Tech' },
  { name: 'Skift Meetings', url: 'https://meetings.skift.com/feed/', category: 'Event Tech' },

  // Removed: Hospitality Net - malformed XML attributes, never successfully parsed
  // Removed: The Information - returns 403, paywalled site, will never work
  // Removed: Bizzabo Blog - malformed XML feed, never successfully parsed

  // SaaS / Startup Business News
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/', category: 'SaaS/Business' },
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', category: 'Startups' },

  // VC & AI Investment
  { name: 'Strictly VC', url: 'https://strictlyvc.com/feed/', category: 'VC/AI Investment' },
  { name: 'Axios Pro Rata', url: 'https://www.axios.com/feeds/feed/pro-rata', category: 'VC/AI Investment' },

  // Business Dev — Vertical Industry Business Intelligence
  { name: 'MeetingsNet', url: 'https://www.meetingsnet.com/rss.xml', category: 'Business Dev' },
  { name: 'Eventbrite Blog', url: 'https://www.eventbrite.com/blog/feed/', category: 'Business Dev' },
]
