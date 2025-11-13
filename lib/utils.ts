import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskApiKey(key: string): string {
  const trimmed = key ?? ""
  if (!trimmed || trimmed.length < 8) return "****"
  const last4 = trimmed.slice(-4)
  if (trimmed.startsWith("ak_")) {
    const prefix = "ak_"
    const middleLength = Math.max(trimmed.length - prefix.length - 4, 0)
    return `${prefix}${"*".repeat(middleLength)}${last4}`
  }
  const middleLength = Math.max(trimmed.length - 4, 0)
  return `${"*".repeat(middleLength)}${last4}`
}
