"use client"

let accessToken: string | null = null

export function setAccessToken(access: string) {
  accessToken = access
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", access)
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== "undefined") {
    accessToken = localStorage.getItem("accessToken")
  }
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken")
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const { refreshAccessTokenServer } = await import("./actions")
    const result = await refreshAccessTokenServer()

    if (result.success && result.accessToken) {
      setAccessToken(result.accessToken)
      return true
    }

    clearAccessToken()
    return false
  } catch (error) {
    console.error("[v0] Token refresh failed:", error)
    clearAccessToken()
    return false
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}
