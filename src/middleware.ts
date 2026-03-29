import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from './lib/auth'

function unauthorized(request: NextRequest, expired = false) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const loginUrl = new URL('/login', request.url)
  if (expired) {
    loginUrl.searchParams.set('expired', '1')
  }
  return NextResponse.redirect(loginUrl)
}

// CSRF protection: validate Origin/Referer on mutating requests
export function isValidOrigin(request: NextRequest): boolean {
  const method = request.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true
  }

  const origin = request.headers.get('origin')
  if (!origin) {
    // Check Referer as fallback
    const referer = request.headers.get('referer')
    if (!referer) return false
    try {
      const refererUrl = new URL(referer)
      return refererUrl.host === request.nextUrl.host
    } catch {
      return false
    }
  }

  try {
    const originUrl = new URL(origin)
    return originUrl.host === request.nextUrl.host
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  // CSRF protection for mutating requests
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // /api/auth handles its own authentication (password check) -- skip session validation
  if (request.nextUrl.pathname === '/api/auth') {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session')?.value

  // Fast path: no cookie at all
  if (!sessionToken) {
    return unauthorized(request)
  }

  // Validate token against the database (checks existence, absolute expiry, and idle timeout)
  const session = await validateSession(sessionToken)
  if (!session.valid) {
    const response = unauthorized(request, session.expired)
    // Clear the invalid/expired cookie
    response.cookies.delete('session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/auth',
    '/api/intake/:path*',
    '/api/inputs/:path*',
    '/api/synthesis/:path*',
    '/api/themes/:path*',
    '/api/digests/:path*',
    '/api/admin/feeds/:path*',
  ],
}
