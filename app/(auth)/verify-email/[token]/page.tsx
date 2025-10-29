"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailPage() {
  const params = useParams()
  const token = params.token as string
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await apiClient.auth.verifyEmail({
          params: { token },
          body: {},
        })
        console.log(" Email verification response:", response)
        if (response.status === 201) {
          setStatus("success")
          setMessage(response.body.message || "Email verified successfully")
        } else {
          setStatus("error")
          setMessage("Verification failed. The link may be invalid or expired.")
        }
      } catch (error) {
        console.error(" Email verification error:", error)
        setStatus("error")
        setMessage("An error occurred during verification")
      }
    }

    if (token) {
      verifyEmail()
    }
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && <Loader2 className="h-16 w-16 text-primary animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-16 w-16 text-primary" />}
            {status === "error" && <XCircle className="h-16 w-16 text-destructive" />}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Health Portal</span>
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Verifying Email"}
            {status === "success" && "Email Verified"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status !== "loading" && (
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
