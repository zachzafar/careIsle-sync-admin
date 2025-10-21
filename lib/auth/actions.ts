"use server"

import { cookies } from "next/headers"

const REFRESH_TOKEN_COOKIE = "refreshToken"
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function setRefreshTokenCookie(refreshToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}

export async function getRefreshTokenCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(REFRESH_TOKEN_COOKIE)
  return token?.value || null
}

export async function clearRefreshTokenCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
}

export async function refreshAccessTokenServer(): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
}> {
  const refreshToken = await getRefreshTokenCookie()

  if (!refreshToken) {
    return { success: false }
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    if (response.ok) {
      const data = await response.json()

      // Set new refresh token cookie
      await setRefreshTokenCookie(data.refreshToken)

      return {
        success: true,
        accessToken: data.token,
        refreshToken: data.refreshToken,
      }
    }

    // Clear cookie on failure
    await clearRefreshTokenCookie()
    return { success: false }
  } catch (error) {
    console.error("[v0] Token refresh failed:", error)
    await clearRefreshTokenCookie()
    return { success: false }
  }
}
