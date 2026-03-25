import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { eq, lt } from 'drizzle-orm'
import { db } from './db'
import { sessions } from './schema'

/** Generate a cryptographically random 32-byte hex session token */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Create a new session in the database with 7-day expiry */
export async function createSession(): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(sessions).values({ token, expiresAt })
  return token
}

/** Validate a session token — check it exists and hasn't expired */
export async function validateSession(token: string): Promise<boolean> {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1)
  if (result.length === 0) return false
  return new Date(result[0].expiresAt) > new Date()
}

/** Delete a session (logout) */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token))
}

/** Clean up expired sessions (called periodically) */
export async function cleanExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

/** Verify password against AUTH_PASSWORD_HASH env var using bcrypt comparison */
export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH
  if (!hash) throw new Error('AUTH_PASSWORD_HASH environment variable not set')
  return bcrypt.compare(password, hash)
}
