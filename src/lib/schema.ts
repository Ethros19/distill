import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  jsonb,
  smallint,
  real,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// inputs — raw feedback records captured via email, paste, or other channels
// ---------------------------------------------------------------------------
export const inputs = pgTable(
  'inputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    source: varchar('source', { length: 50 }).notNull(),
    contributor: text('contributor').notNull(),
    rawContent: text('raw_content').notNull(),
    summary: text('summary'),
    type: varchar('type', { length: 50 }),
    themes: jsonb('themes').$type<string[]>(),
    urgency: smallint('urgency'),
    confidence: real('confidence'),
    contentHash: varchar('content_hash', { length: 64 }),
    status: varchar('status', { length: 20 }).notNull().default('unprocessed'),
    isFeedback: boolean('is_feedback').notNull().default(true),
    notes: text('notes'),
  },
  (table) => [
    uniqueIndex('inputs_content_hash_idx').on(table.contentHash),
    index('inputs_status_idx').on(table.status),
    index('inputs_created_at_idx').on(table.createdAt),
  ],
)

// ---------------------------------------------------------------------------
// syntheses — synthesis run results (weekly cron, manual, or theme query)
// ---------------------------------------------------------------------------
export const syntheses = pgTable('syntheses', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  inputCount: integer('input_count').notNull(),
  signalCount: integer('signal_count').notNull(),
  digestMarkdown: text('digest_markdown'),
  trigger: varchar('trigger', { length: 20 }).notNull(),
})

// ---------------------------------------------------------------------------
// signals — named patterns extracted from a synthesis run
// ---------------------------------------------------------------------------
export const SIGNAL_STATUSES = ['new', 'acknowledged', 'in_progress', 'resolved'] as const
export type SignalStatus = (typeof SIGNAL_STATUSES)[number]

export const signals = pgTable(
  'signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    synthesisId: uuid('synthesis_id')
      .notNull()
      .references(() => syntheses.id),
    statement: text('statement').notNull(),
    reasoning: text('reasoning').notNull(),
    evidence: jsonb('evidence').notNull().$type<string[]>(),
    suggestedAction: text('suggested_action'),
    themes: jsonb('themes').$type<string[]>(),
    strength: smallint('strength').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('new'),
    linearIssueUrl: text('linear_issue_url'),
    notes: text('notes'),
  },
  (table) => [
    index('signals_synthesis_id_idx').on(table.synthesisId),
    index('signals_status_idx').on(table.status),
  ],
)

// ---------------------------------------------------------------------------
// sessions — password-based auth sessions
// ---------------------------------------------------------------------------
export const sessions = pgTable(
  'sessions',
  {
    token: varchar('token', { length: 64 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_last_activity_at_idx').on(table.lastActivityAt),
  ],
)

// ---------------------------------------------------------------------------
// login_attempts — tracks login attempts per IP for rate limiting
// ---------------------------------------------------------------------------
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ip: varchar('ip', { length: 45 }).notNull(), // IPv6 max length
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
    success: boolean('success').notNull().default(false),
  },
  (table) => [
    index('login_attempts_ip_idx').on(table.ip),
    index('login_attempts_attempted_at_idx').on(table.attemptedAt),
  ],
)

// ---------------------------------------------------------------------------
// settings — key-value configuration (product context, preferences, etc.)
// ---------------------------------------------------------------------------
export const settings = pgTable('settings', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// feed_sources — RSS/Atom feed configurations for automated ingestion
// ---------------------------------------------------------------------------
export const feedSources = pgTable(
  'feed_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    name: varchar('name', { length: 100 }).notNull(),
    url: text('url').notNull(),
    category: varchar('category', { length: 50 }),
    pollingInterval: integer('polling_interval').notNull().default(60), // minutes
    enabled: boolean('enabled').notNull().default(true),
    lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),
    lastError: text('last_error'),
  },
  (table) => [
    uniqueIndex('feed_sources_url_idx').on(table.url),
    index('feed_sources_enabled_idx').on(table.enabled),
  ],
)

// ---------------------------------------------------------------------------
// Inferred types for use across the codebase
// ---------------------------------------------------------------------------
export type Input = typeof inputs.$inferSelect
export type NewInput = typeof inputs.$inferInsert
export type Signal = typeof signals.$inferSelect
export type NewSignal = typeof signals.$inferInsert
export type Synthesis = typeof syntheses.$inferSelect
export type NewSynthesis = typeof syntheses.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type LoginAttempt = typeof loginAttempts.$inferSelect
export type NewLoginAttempt = typeof loginAttempts.$inferInsert
export type FeedSource = typeof feedSources.$inferSelect
export type NewFeedSource = typeof feedSources.$inferInsert
