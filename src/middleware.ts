// ─── SELEEVENT MIDDLEWARE ──────────────────────────────────────────────────
// Route protection: ALL routes are allowed through.
// Mock mode is ON by default — client-side auth-store handles auto-login
// based on URL path. No server-side auth blocking needed.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  // Allow all requests — client-side auth handles role-based access
  // Mock mode auto-login detects role from URL path (/admin → ADMIN, etc.)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
