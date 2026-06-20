"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Mail, Calendar, CheckCircle, LogOut } from "lucide-react"

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "N/A"

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Your account details and security status</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 max-w-2xl">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <span className="font-mono text-sm text-foreground">{user.email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Member Since
                  </span>
                  <span className="text-sm text-foreground">{formattedDate}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Security Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">JWT Authentication</span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="mr-1 h-3 w-3" /> Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">End-to-End Encryption</span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="mr-1 h-3 w-3" /> AES-CBC
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Key Derivation</span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="mr-1 h-3 w-3" /> HKDF-SHA256
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl">
            <Button variant="destructive" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}