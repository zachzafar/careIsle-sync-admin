"use client"

import { useRouter } from "next/navigation"
import { clearAccessToken, isAuthenticated } from "../auth/token"
import { clearRefreshTokenCookie } from "../auth/actions"

export function useAuth() {
  const router = useRouter()

  const logout = async () => {
    clearAccessToken()
    await clearRefreshTokenCookie()
    router.push("/login")
  }

  return {
    isAuthenticated: isAuthenticated(),
    logout,
  }
}
