"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { tsr } from "@/lib/api/tsr"
import { setAccessToken } from "@/lib/auth/token"
import { setRefreshTokenCookie } from "@/lib/auth/actions"
import { toast } from "sonner"
import { Activity } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const { mutate, isPending } = tsr.auth.login.useMutation({
    onSuccess: async (data) => {
      if (data.status === 200) {
        setAccessToken(data.body.token)
        await setRefreshTokenCookie(data.body.refreshToken)

        toast.success("Login successful", {
          description: `Welcome back, ${data.body.user.firstname}!`,
        })
        router.push("/dashboard")
      }
    },
    onError: () => {
      toast.error("Login failed", {
        description: "Invalid email or password",
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ body: { email, password } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Health Portal</span>
          </div>
          <CardTitle className="text-2xl">Sign in to Admin</CardTitle>
          <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/register-admin" className="text-primary hover:underline">
              Register as Admin
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
