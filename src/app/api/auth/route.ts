import { NextRequest, NextResponse } from 'next/server'
import { createSession, deleteAllSessions, deleteSession, verifyPassword } from '@/lib/auth'
import { checkRateLimit, recordLoginAttempt } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password } = body

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rateCheck = await checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } },
    )
  }

  try {
    if (!await verifyPassword(password)) {
      await recordLoginAttempt(ip, false)
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch {
    await recordLoginAttempt(ip, false)
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  await recordLoginAttempt(ip, true)
  const token = await createSession()

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return response
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value
  if (sessionToken) {
    await deleteSession(sessionToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('session')
  return response
}
