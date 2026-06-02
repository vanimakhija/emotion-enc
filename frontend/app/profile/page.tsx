"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  // ✅ Safe date handling
  let formattedDate = "N/A"
  if (user.created_at) {
    const parsed = new Date(user.created_at)
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleString()
    }
  }

  return (
    <ProtectedRoute>
      <div className="p-6 lg:p-8">
        <Card className="max-w-xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Profile
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </span>
              <span className="font-mono text-sm text-foreground">
                {user.email}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account Created
              </span>
              <span className="text-sm text-muted-foreground">
                {formattedDate}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
