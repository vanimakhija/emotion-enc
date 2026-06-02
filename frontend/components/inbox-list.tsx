"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { messagesAPI } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Inbox,
  Lock,
  Unlock,
  Smile,
  Frown,
  Meh,
  Clock,
  Send,
  AlertOctagon,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

const emotionIcons: Record<string, React.ElementType> = {
  Positive: Smile,
  Negative: Frown,
  Neutral: Meh,
}

const riskColors: Record<string, string> = {
  Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  High: "bg-orange-500/15 text-orange-400 border-orange-500/30",
}

const encryptionColors: Record<string, string> = {
  "AES-128": "text-emerald-400",
  "AES-192": "text-amber-400",
  "AES-256": "text-primary",
}

interface Message {
  id: string
  sender_id: number
  recipient_id: number
  sender_email: string
  recipient_email: string
  emotion: string
  risk: string
  encryption: string
  timestamp: string
  is_read: boolean
}

const folderMeta: Record<
  string,
  { title: string; description: string; icon: React.ElementType; statusLabel: string }
> = {
  inbox: {
    title: "Encrypted Inbox",
    description: "encrypted message{s} in vault",
    icon: Inbox,
    statusLabel: "VAULT ACTIVE",
  },
  sent: {
    title: "Sent Messages",
    description: "encrypted message{s} sent",
    icon: Send,
    statusLabel: "OUTBOUND SECURE",
  },
  spam: {
    title: "Spam",
    description: "message{s} flagged as spam",
    icon: AlertOctagon,
    statusLabel: "QUARANTINED",
  },
  deleted: {
    title: "Deleted",
    description: "message{s} in trash",
    icon: Trash2,
    statusLabel: "MARKED FOR PURGE",
  },
}

interface InboxListProps {
  folder?: string
}

export function InboxList({ folder = "inbox" }: InboxListProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [folder])

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)
      // Call the correct endpoint based on folder
      const data = folder === "sent" 
        ? await messagesAPI.sent() 
        : await messagesAPI.inbox()
      setMessages(data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Failed to load messages"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const meta = folderMeta[folder] || folderMeta.inbox
  const FolderIcon = meta.icon

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Backend returns all messages for the user
  // For now, show all messages in both inbox and sent
  // In future, backend could add a "folder" or "type" field
  const filteredMessages = messages

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredMessages.length}{" "}
            {meta.description.replace("{s}", filteredMessages.length !== 1 ? "s" : "")}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
          <FolderIcon className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-xs text-muted-foreground">{meta.statusLabel}</span>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertOctagon className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Failed to load messages</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredMessages.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <FolderIcon className="h-12 w-12 text-muted-foreground/30" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {folder === "inbox"
                  ? "No messages yet"
                  : folder === "sent"
                    ? "No sent messages"
                    : folder === "spam"
                      ? "No spam messages"
                      : "Trash is empty"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {folder === "inbox" || folder === "sent"
                  ? "Compose a message to get started"
                  : folder === "spam"
                    ? "Messages flagged as spam will appear here"
                    : "Deleted messages will appear here"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Table header for md+ */}
          <div className="hidden rounded-lg border border-border bg-secondary/30 px-4 py-2.5 md:grid md:grid-cols-12 md:gap-4">
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ID
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recipient
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Emotion
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Risk
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Encryption
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </span>
          </div>

          {filteredMessages.map((msg) => {
            const EmotionIcon = emotionIcons[msg.emotion] ?? Meh

            return (
              <Card
                key={msg.id}
                className="border-border bg-card transition-colors hover:border-primary/20"
              >
                <CardContent className="p-0">
                  {/* Desktop row */}
                  <div className="hidden items-center px-4 py-3 md:grid md:grid-cols-12 md:gap-4">
                    <div className="col-span-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {msg.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-foreground">
                        {folder === "sent" ? msg.recipient_email : msg.sender_email}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <EmotionIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm capitalize text-foreground">{msg.emotion}</span>
                    </div>
                    <div className="col-span-2">
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-xs uppercase", riskColors[msg.risk])}
                      >
                        {msg.risk}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold",
                          encryptionColors[msg.encryption]
                        )}
                      >
                        {msg.encryption}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <Link href={`/decrypt/${msg.id}`}>
                          <Unlock className="h-3.5 w-3.5" />
                          <span className="sr-only md:not-sr-only">Decrypt</span>
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="flex flex-col gap-3 p-4 md:hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {msg.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-xs uppercase", riskColors[msg.risk])}
                      >
                        {msg.risk}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <EmotionIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm capitalize text-foreground">{msg.emotion}</span>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold",
                          encryptionColors[msg.encryption]
                        )}
                      >
                        {msg.encryption}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <Link href={`/decrypt/${msg.id}`}>
                          <Unlock className="h-3.5 w-3.5" />
                          Decrypt
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
