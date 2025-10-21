import { initClient } from "@ts-rest/core"
import { contract } from "./contract"
import { getAccessToken, refreshAccessToken } from "../auth/token"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const apiClient = initClient(contract, {
  baseUrl,
  baseHeaders: {},
  api: async ({ path, method, headers, body }) => {
    const token = getAccessToken()
    const requestHeaders: HeadersInit = {
      ...headers,
      "Content-Type": "application/json",
    }

    // Add Authorization header for protected routes
    if (token && (path.includes("/patients") || path.includes("/facility"))) {
      requestHeaders["Authorization"] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      // Handle 401 - try to refresh token
      if (response.status === 401 && token) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry request with new token
          requestHeaders["Authorization"] = `Bearer ${getAccessToken()}`
          const retryResponse = await fetch(`${baseUrl}${path}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
          })
          return {
            status: retryResponse.status,
            body: await retryResponse.json(),
            headers: retryResponse.headers,
          }
        }
      }

      const responseBody = response.status !== 204 ? await response.json() : null

      return {
        status: response.status,
        body: responseBody,
        headers: response.headers,
      }
    } catch (error) {
      console.error("[v0] API request failed:", error)
      throw error
    }
  },
})
