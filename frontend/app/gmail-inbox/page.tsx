"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { gmailAPI, GmailMessage } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, AlertCircle, RefreshCw } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { toast } from "sonner"

export default function GmailInboxPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <GmailInboxView />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function GmailInboxView() {
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadGmailMessages()
  }, [])

  const loadGmailMessages = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await gmailAPI.inbox()
      setMessages(response.messages)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Failed to load Gmail messages"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadGmailMessages()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gmail Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""} from your Gmail
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && !messages.length && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Unable to load Gmail</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {messages.length === 0 && !error ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Mail className="h-12 w-12 text-muted-foreground/30" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No messages in inbox
              </p>
              <p className="text-xs text-muted-foreground/70">
                Your Gmail inbox is empty or offline
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <GmailMessageCard
              key={msg.id}
              message={msg}
              isExpanded={expandedId === msg.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === msg.id ? null : msg.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface GmailMessageCardProps {
  message: GmailMessage
  isExpanded: boolean
  onToggleExpand: () => void
}

function GmailMessageCard({
  message,
  isExpanded,
  onToggleExpand,
}: GmailMessageCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return dateStr
    }
  }

  // Extract email address from "Name <email@domain.com>" format
  const extractEmail = (fromStr: string) => {
    const match = fromStr.match(/<(.+?)>/)
    return match ? match[1] : fromStr
  }

  return (
    <Card
      className="border-border bg-card transition-colors hover:border-primary/20 cursor-pointer"
      onClick={onToggleExpand}
    >
      <CardContent className="p-4">
        {/* Collapsed view */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {message.subject}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {extractEmail(message.from)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {message.snippet || "(No preview)"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="whitespace-nowrap">
              {formatDate(message.date)}
            </Badge>
          </div>
        </div>

        {/* Expanded view */}
        {isExpanded && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  From
                </p>
                <p className="text-sm text-foreground break-all">
                  {message.from}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Date
                </p>
                <p className="text-sm text-foreground">
                  {new Date(message.date).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Preview
                </p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                  {message.snippet || "(No content preview)"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                💡 Full message available in Gmail. Click to open in Gmail.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
