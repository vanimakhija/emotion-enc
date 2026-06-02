"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function OAuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      // Store JWT
      localStorage.setItem("access_token", token)

      // Redirect to dashboard
      router.replace("/")
    } else {
      router.replace("/login")
    }
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Completing Google Login...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please wait while we log you in.
        </p>
      </div>
    </div>
  )
}
