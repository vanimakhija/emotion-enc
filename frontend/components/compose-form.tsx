"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { messagesAPI } from "@/lib/api"
import {
  Send,
  ShieldCheck,
  Brain,
  AlertTriangle,
  Lock,
  Smile,
  Frown,
  Meh,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const emotionIcons: Record<string, React.ElementType> = {
  Positive: Smile,
  Negative: Frown,
  Neutral: Meh,
}

const riskColors: Record<string, string> = {
  Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  High: "bg-red-500/15 text-red-400 border-red-500/30",
}

export function ComposeForm() {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [recipient, setRecipient] = useState("")
  const [analysis, setAnalysis] = useState<{
    emotion: string
    risk: string
    encryption: string
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ REAL-TIME ANALYSIS WITH DEBOUNCE
  const handleMessageChange = useCallback((value: string) => {
    setMessage(value)
    setSent(false)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim().length < 3) {
      setAnalysis(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: value }),
        })

        if (!response.ok) return

        const data = await response.json()

        setAnalysis({
          emotion: data.emotion,
          risk: data.risk,
          encryption: data.encryption,
        })
      } catch (error) {
        console.error("Real-time analysis failed:", error)
      }
    }, 500)
  }, [])

  // ✅ SEND MESSAGE
  const handleSend = useCallback(async () => {
    if (!message.trim() || !recipient.trim()) return

    setSending(true)

    try {
      const result = await messagesAPI.send(
        message.trim(),
        recipient.trim()
      )

      setAnalysis({
        emotion: result.emotion,
        risk: result.risk,
        encryption: result.encryption,
      })

      setSent(true)
      setMessage("")
      setRecipient("")
      toast.success("Message sent successfully!")

      setTimeout(() => {
        router.push("/inbox")
      }, 800)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to send message")
    } finally {
      setSending(false)
    }
  }, [message, recipient, router])

  const EmotionIcon = analysis
    ? emotionIcons[analysis.emotion] || Brain
    : Brain

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Compose Message
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emotion analysis determines encryption strength in real-time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Recipient
                </label>
                <Input
                  placeholder="e.g. alice@shield.io"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value)
                    setSent(false)
                  }}
                  disabled={sending}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Message
                </label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) =>
                    handleMessageChange(e.target.value)
                  }
                  rows={8}
                  disabled={sending}
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!message.trim() || !recipient.trim() || sending}
                className="w-full gap-2"
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Encrypting...
                  </>
                ) : sent ? (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Message Sent
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Encrypt & Send
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE — REAL TIME ANALYSIS */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-primary" />
                Real-Time Analysis
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {analysis ? (
                <>
                  {/* Emotion */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">
                      Detected Emotion
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <EmotionIcon className="h-4 w-4 text-primary" />
                      <span>{analysis.emotion}</span>
                    </div>
                  </div>

                  {/* Risk */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">
                      Risk Level
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1",
                        riskColors[analysis.risk]
                      )}
                    >
                      {analysis.risk}
                    </Badge>
                  </div>

                  {/* Encryption */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">
                      Encryption Type
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="font-mono">
                        {analysis.encryption}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Start typing to analyze emotion
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
