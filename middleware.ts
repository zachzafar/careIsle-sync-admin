import { NextResponse, NextRequest } from "next/server"

const REFRESH_TOKEN_COOKIE = "refreshToken"
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

function isPublicPath(pathname: string) {
  // Allow public/auth routes and static assets
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register-admin") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  )
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/facilities") ||
    pathname.startsWith("/patients")
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip public paths
  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // Only check presence of refresh token; avoid backend calls here
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) {
    const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Token present; allow the request. Actual validation/rotation happens server-side.
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/facilities/:path*", "/patients/:path*"],
}