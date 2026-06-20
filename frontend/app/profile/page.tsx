"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyticsAPI, messagesAPI } from "@/lib/api"
import { BarChart2, ShieldCheck, Send, Inbox } from "lucide-react"

const EMOTION_COLORS: Record<string, string> = {
  Positive: "#10b981",
  Neutral:  "#f59e0b",
  Negative: "#ef4444",
}

const ENCRYPTION_COLORS: Record<string, string> = {
  "AES-128": "#10b981",
  "AES-192": "#f59e0b",
  "AES-256": "#6366f1",
}

export default function AnalyticsPage() {
  const [emotionData, setEmotionData]     = useState<{ name: string; value: number }[]>([])
  const [encryptionData, setEncryptionData] = useState<{ name: string; value: number }[]>([])
  const [totalSent, setTotalSent]         = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [emotions, sent, inbox] = await Promise.all([
          analyticsAPI.emotions(),
          messagesAPI.sent(),
          messagesAPI.inbox(),
        ])

        setEmotionData(
          Object.entries(emotions).map(([name, value]) => ({ name, value: value as number }))
        )
        setTotalSent(sent.length)
        setTotalReceived(inbox.length)

        // Build encryption distribution from sent messages
        const encMap: Record<string, number> = {}
        sent.forEach(m => { encMap[m.encryption] = (encMap[m.encryption] || 0) + 1 })
        setEncryptionData(Object.entries(encMap).map(([name, value]) => ({ name, value })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const totalMessages = emotionData.reduce((a, b) => a + b.value, 0)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-primary" /> Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Insight into your encryption patterns and sentiment distribution
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Sent", value: totalSent, icon: Send, color: "text-primary" },
              { label: "Total Received", value: totalReceived, icon: Inbox, color: "text-emerald-400" },
              { label: "Encrypted Msgs", value: totalMessages, icon: ShieldCheck, color: "text-amber-400" },
              { label: "Encryption Tiers", value: encryptionData.length || 0, icon: BarChart2, color: "text-purple-400" },
            ].map(stat => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Emotion pie chart */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Emotion Distribution (Sent)</CardTitle>
              </CardHeader>
              <CardContent>
                {emotionData.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    No data yet — send some messages first
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={emotionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {emotionData.map(entry => (
                          <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || "#6366f1"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} messages`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Encryption bar chart */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Encryption Tier Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {encryptionData.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    No data yet — send some messages first
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={encryptionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {encryptionData.map(entry => (
                          <Cell key={entry.name} fill={ENCRYPTION_COLORS[entry.name] || "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mapping table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Sentiment → Encryption Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { emotion: "Positive 😊", risk: "Low", enc: "AES-128", color: "border-emerald-500/30 bg-emerald-500/5", badge: "text-emerald-400" },
                  { emotion: "Neutral 😐", risk: "Medium", enc: "AES-192", color: "border-amber-500/30 bg-amber-500/5", badge: "text-amber-400" },
                  { emotion: "Negative 😠", risk: "High", enc: "AES-256", color: "border-red-500/30 bg-red-500/5", badge: "text-red-400" },
                ].map(row => (
                  <div key={row.enc} className={`rounded-lg border p-4 ${row.color}`}>
                    <p className="text-sm font-medium text-foreground">{row.emotion}</p>
                    <p className="text-xs text-muted-foreground mt-1">Risk: {row.risk}</p>
                    <p className={`mt-2 font-mono text-sm font-bold ${row.badge}`}>{row.enc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}