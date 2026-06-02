"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function OAuthSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get("token")

    if (token) {
      localStorage.setItem("access_token", token)
      router.push("/")
    } else {
      router.push("/login")
    }
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      Logging you in...
    </div>
  )
}
