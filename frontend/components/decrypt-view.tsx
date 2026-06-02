"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { messagesAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Unlock,
  FileText,
  Clock,
  User,
  Smile,
  Frown,
  Meh,
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

interface Message {
  id: string
  recipient: string
  emotion: string
  risk: string
  encryption: string
  timestamp: string
}

export function DecryptView({ messageId }: { messageId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<Message | null>(null)
  const [decryptedText, setDecryptedText] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [decrypted, setDecrypted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessage()
  }, [messageId])

  const loadMessage = async () => {
    try {
      setLoading(true)
      const messages = await messagesAPI.list()
      const found = messages.find((m) => m.id === messageId)
      if (found) {
        setMessage(found)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to load message")
    } finally {
      setLoading(false)
    }
  }

  const handleDecrypt = async () => {
    if (!message) return
    setDecrypting(true)
    try {
      const result = await messagesAPI.decrypt(message.id)
      setDecryptedText(result.plaintext)
      setDecrypted(true)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to decrypt message")
    } finally {
      setDecrypting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Message not found</p>
        <Button variant="outline" onClick={() => router.push("/inbox")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Button>
      </div>
    )
  }

  const EmotionIcon = emotionIcons[message.emotion] ?? Meh

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/inbox")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to inbox</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Decryption Console
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Message {message.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message metadata */}
        <Card className="border-border bg-card lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Message Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Message ID
              </span>
              <span className="font-mono text-sm text-foreground">{message.id}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recipient
              </span>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-sm text-foreground">{message.recipient}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Emotion
              </span>
              <div className="flex items-center gap-2">
                <EmotionIcon className="h-4 w-4 text-primary" />
                <span className="text-sm capitalize text-foreground">{message.emotion}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Risk Level
              </span>
              <Badge
                variant="outline"
                className={cn("w-fit font-mono text-xs uppercase", riskColors[message.risk])}
              >
                {message.risk}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Encryption
              </span>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-sm font-semibold text-primary">
                  {message.encryption}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Timestamp
              </span>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decryption panel */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Encrypted Message
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Message is encrypted with {message.encryption}
                </p>
              </div>
            </CardContent>
          </Card>

          {!decrypted && (
            <Button
              onClick={handleDecrypt}
              disabled={decrypting}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              {decrypting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Decrypting with {message.encryption}...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  Decrypt Message
                </>
              )}
            </Button>
          )}

          {decrypted && decryptedText && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Decrypted Plaintext
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="rounded-lg border border-primary/20 bg-card p-4">
                  <p className="text-sm leading-relaxed text-foreground">{decryptedText}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => router.push("/inbox")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
        </div>
      </div>
    </div>
  )
}
