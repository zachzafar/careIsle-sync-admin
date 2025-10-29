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
  console.log("refreshing token getting cookie")
  const refreshToken = await getRefreshTokenCookie()

  if (!refreshToken) {
    return { success: false }
  }

  console.log("refreshing token sending request ")
  try {
    const apiURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    const url = `${apiURL}/refresh`
    const payload = { refreshToken }
    const requestHeaders = { "Content-Type": "application/json", "Accept": "application/json" }

    // Debug: log the outgoing request details
    console.debug("[auth] Refresh token request", { url, payload, headers: requestHeaders })

    const axios = (await import("axios")).default
    const response = await axios.post(url, payload, { headers: requestHeaders })

    // Debug: log the response details
    console.debug("[auth] Refresh token response", { status: response.status, data: response.data })

    if (response.status >= 200 && response.status < 300) {
      const data = response.data

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
  } catch (error: any) {
    // Extra debugging for axios-style errors
    if (error?.response) {
      console.error("[auth] Refresh token axios error", {
        status: error.response.status,
        data: error.response.data,
      })
    } else {
      console.error("[v0] Token refresh failed:", error)
    }

    await clearRefreshTokenCookie()
    return { success: false }
  }
}
