import { initClient } from "@ts-rest/core"
import { contract } from "./contract"
import { getAccessToken, refreshAccessToken } from "../auth/token"
import axios, { AxiosError, AxiosResponse, isAxiosError, Method } from "axios"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// Create a normalized axios instance with interceptors

const axiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    "Accept": "application/json",
  },
})

axiosInstance.interceptors.request.use(async (config) => {
  const token = getAccessToken()
  if (token) {
        config.headers = new axios.AxiosHeaders({
          ...config.headers,
          Authorization: `Bearer ${token}`,
        });

        if (config.data instanceof FormData) {
          console.log(config.data)
          config.headers['Content-Type'] = "multipart/form-data"
        }
      }
  
      return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config
    if (error?.response?.status === 401 && config && !(config as any).sent) {
      ;(config as any).sent = true
      const refreshed = await refreshAccessToken()
      if (!refreshed) {
        return Promise.reject(error)
      }
      const newToken = getAccessToken()
      config.headers = {
        ...config.headers,
        Authorization: newToken ? `Bearer ${newToken}` : undefined,
      }
      return axiosInstance.request(config)
    }
    return Promise.reject(error)
  }
)

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


      const result = await axiosInstance.request({
        method: method as Method,
        url: path,
        headers: requestHeaders,
        data: body,
      })

      const headersObj = new Headers()
      Object.entries(result.headers ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          headersObj.append(key, Array.isArray(value) ? value.join(", ") : String(value))
        }
      })

      return {
        status: result.status,
        body: result.status !== 204 ? result.data : null,
        headers: headersObj,
      }
    } catch (e: Error | AxiosError | any) {
      if (isAxiosError(e)) {
        const response = (e as AxiosError).response as AxiosResponse | undefined
        if (response) {
          const headersObj = new Headers()
          Object.entries(response.headers ?? {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              headersObj.append(key, Array.isArray(value) ? value.join(", ") : String(value))
            }
          })

          return {
            status: response.status,
            body: response.status !== 204 ? response.data : null,
            headers: headersObj,
          }
        }
      }
      console.error("[v0] API request failed:", e)
      throw e
    }
  },
})
