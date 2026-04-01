// ---------------------------------------------------------------------------
// Distill Configuration — customize streams, colors, and taxonomy
// ---------------------------------------------------------------------------
// Edit this file to define your intelligence streams. Each stream represents
// a domain of intelligence that Distill tracks, synthesizes, and displays.
//
// After changing streams, run a new synthesis to re-classify existing inputs.
// ---------------------------------------------------------------------------

export interface StreamConfig {
  /** Unique slug used in URLs and database (e.g., 'general-ai') */
  id: string
  /** Human-readable label shown in the UI (e.g., 'AI & LLM') */
  label: string
  /** Short description used in LLM prompts to guide classification */
  description: string
  /** Hex color for UI elements — charts, dots, borders, badges */
  hex: string
  /** Pin this stream first on the Intelligence Radar page */
  pinFirst?: boolean
  /** Mark as high-volume — gets a lower query limit in synthesis to avoid prompt bloat */
  highVolume?: boolean
  /** Feed source categories that map to this stream (used by RSS feed ingestion) */
  categories?: string[]
}

// ---------------------------------------------------------------------------
// Default streams — replace these with your own domain taxonomy
// ---------------------------------------------------------------------------

export const streams: StreamConfig[] = [
  {
    id: 'general-ai',
    label: 'AI & LLM',
    description: 'AI model releases, API changes, research breakthroughs, regulation',
    hex: '#a855f7',
    highVolume: true,
    categories: ['AI News', 'AI Research', 'AI Digest', 'LLM/Product', 'Tech Business'],
  },
  {
    id: 'business-dev',
    label: 'Business & Vertical AI',
    description: 'AI applications in your vertical industry, business intelligence',
    hex: '#10b981',
    pinFirst: true,
    categories: ['SaaS/Business', 'Business Dev'],
  },
  {
    id: 'event-tech',
    label: 'Event Technology',
    description: 'Event platforms, competitor moves, tooling trends',
    hex: '#f97316',
    categories: ['Event Tech', 'Competitor Intel'],
  },
  {
    id: 'event-general',
    label: 'Events & Hospitality',
    description: 'Industry trends, trade shows, hospitality, seasonal demand',
    hex: '#f59e0b',
    categories: ['Events', 'Meetings', 'Hospitality'],
  },
  {
    id: 'vc-investment',
    label: 'VC & Investment',
    description: 'Funding rounds, M&A activity, startup investments',
    hex: '#3b82f6',
    categories: ['Funding', 'Startups', 'VC/AI Investment'],
  },
  {
    id: 'product',
    label: 'Product Feedback',
    description: 'Direct product feedback, feature requests, user insights',
    hex: '#3D8A4A',
  },
]
