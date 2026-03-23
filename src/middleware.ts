import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value

  if (!sessionToken) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
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
