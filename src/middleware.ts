import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from './lib/auth'

function unauthorized(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value

  // Fast path: no cookie at all
  if (!sessionToken) {
    return unauthorized(request)
  }

  // Validate token against the database (checks existence + expiry)
  const valid = await validateSession(sessionToken)
  if (!valid) {
    const response = unauthorized(request)
    // Clear the invalid/expired cookie
    response.cookies.delete('session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/intake/:path*',
    '/api/inputs/:path*',
    '/api/synthesis/:path*',
    '/api/themes/:path*',
    '/api/digests/:path*',
  ],
}
