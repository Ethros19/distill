import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { eq, lt, and, gt } from 'drizzle-orm'
import { db } from './db'
import { sessions } from './schema'

/** 4-hour idle timeout in milliseconds */
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000

/** Generate a cryptographically random 32-byte hex session token */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Create a new session in the database with 7-day expiry */
export async function createSession(): Promise<string> {
  const token = generateSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(sessions).values({ token, expiresAt, lastActivityAt: now })
  return token
}

/** Validate a session token — check existence, absolute expiry, and idle timeout */
export async function validateSession(token: string): Promise<{ valid: boolean; expired: boolean }> {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1)

  if (result.length === 0) return { valid: false, expired: false }

  const session = result[0]
  const now = new Date()

  // Check absolute 7-day expiry
  if (new Date(session.expiresAt) <= now) {
    await db.delete(sessions).where(eq(sessions.token, token))
    return { valid: false, expired: true }
  }

  // Check 4-hour idle timeout
  if (new Date(session.lastActivityAt).getTime() + IDLE_TIMEOUT_MS <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.token, token))
    return { valid: false, expired: true }
  }

  // Session is valid — update lastActivityAt
  await db.update(sessions).set({ lastActivityAt: now }).where(eq(sessions.token, token))
  return { valid: true, expired: false }
}

/** Delete a session (logout) */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token))
}

/** Clean up expired sessions (called periodically) */
export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

/** Delete all sessions (session rotation on login) */
export async function deleteAllSessions(): Promise<void> {
  await db.delete(sessions)
}

/** Verify password against AUTH_PASSWORD_HASH env var using bcrypt comparison */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH
  if (!hash) throw new Error('AUTH_PASSWORD_HASH environment variable not set')
  return bcrypt.compare(password, hash)
}
