import { and, eq, gte, desc, lt } from 'drizzle-orm'
import { db } from './db'
import { loginAttempts } from './schema'

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
  failedAttempts: number
}

// Escalating lockout thresholds
const THRESHOLDS = [
  { minAttempts: 20, lockoutSeconds: 15 * 60 },
  { minAttempts: 10, lockoutSeconds: 5 * 60 },
  { minAttempts: 5, lockoutSeconds: 60 },
] as const

const WINDOW_MINUTES = 15

/**
 * Check if an IP is rate-limited based on recent failed login attempts.
 * Applies escalating lockout: 5 fails -> 1min, 10 -> 5min, 20 -> 15min.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  // Get failed attempts in the window, most recent first
  const recentFailures = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, windowStart),
      ),
    )
    .orderBy(desc(loginAttempts.attemptedAt))

  const failedAttempts = recentFailures.length

  // Find the applicable lockout threshold
  for (const threshold of THRESHOLDS) {
    if (failedAttempts >= threshold.minAttempts) {
      const latestAttempt = recentFailures[0]
      const secondsSinceLatest = (Date.now() - new Date(latestAttempt.attemptedAt).getTime()) / 1000
      const retryAfterSeconds = Math.max(0, Math.ceil(threshold.lockoutSeconds - secondsSinceLatest))

      if (retryAfterSeconds > 0) {
        return { allowed: false, retryAfterSeconds, failedAttempts }
      }
      // Lockout period has elapsed — allowed
      return { allowed: true, retryAfterSeconds: 0, failedAttempts }
    }
  }

  // Below all thresholds — allowed
  return { allowed: true, retryAfterSeconds: 0, failedAttempts }
}

/**
 * Record a login attempt (successful or failed) for the given IP.
 */
export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  await db.insert(loginAttempts).values({ ip, success })
}

/**
 * Delete login attempt records older than 24 hours.
 * Intended to be called from a daily cron job.
 */
export async function cleanOldAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, cutoff))
}
