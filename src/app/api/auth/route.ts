import { NextRequest, NextResponse } from 'next/server'
import { createSession, deleteSession, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password } = body

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  try {
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

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
