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
  Send, ShieldCheck, Brain, Lock, Smile, Frown, Meh, Paperclip, X, File,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function ComposeForm() {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [recipient, setRecipient] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<{
    emotion: string; risk: string; encryption: string
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time sentiment analysis — debounced 500ms
  const handleMessageChange = useCallback((value: string) => {
    setMessage(value)
    setSent(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) { setAnalysis(null); return }

    debounceRef.current = setTimeout(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        const response = await fetch(`${API_BASE}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: value }),
        })
        if (!response.ok) return
        const data = await response.json()
        setAnalysis({ emotion: data.emotion, risk: data.risk, encryption: data.encryption })
      } catch {}
    }, 500)
  }, [])

  // File attachment handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      toast.error(`Files must be under 10MB: ${oversized.map(f => f.name).join(", ")}`)
      return
    }
    setAttachments(prev => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (name: string) => {
    setAttachments(prev => prev.filter(f => f.name !== name))
  }

  // Send — uses multipart if attachments, JSON otherwise
  const handleSend = useCallback(async () => {
    if (!message.trim() || !recipient.trim()) return
    setSending(true)
    try {
      let result
      if (attachments.length > 0) {
        const formData = new FormData()
        formData.append("message", message.trim())
        formData.append("recipient", recipient.trim())
        attachments.forEach(f => formData.append("files", f))
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        const res = await fetch(`${API_BASE}/send-with-attachments`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Failed to send")
        }
        result = await res.json()
      } else {
        result = await messagesAPI.send(message.trim(), recipient.trim())
      }

      setAnalysis({ emotion: result.emotion, risk: result.risk, encryption: result.encryption })
      setSent(true)
      setMessage("")
      setRecipient("")
      setAttachments([])
      toast.success(`Message encrypted with ${result.encryption} and sent!`)
      setTimeout(() => router.push("/sent"), 800)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Failed to send message")
    } finally {
      setSending(false)
    }
  }, [message, recipient, attachments, router])

  const EmotionIcon = analysis ? emotionIcons[analysis.emotion] || Brain : Brain

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Compose Message</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emotion analysis determines AES encryption strength in real-time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Recipient</label>
                <Input
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={e => { setRecipient(e.target.value); setSent(false) }}
                  disabled={sending}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={e => handleMessageChange(e.target.value)}
                  rows={8}
                  disabled={sending}
                />
              </div>

              {/* Attachment area */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach files
                  </label>
                  <span className="text-xs text-muted-foreground">Max 10MB per file</span>
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(f => (
                      <div
                        key={f.name}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs"
                      >
                        <File className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[120px] truncate text-foreground">{f.name}</span>
                        <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)}KB)</span>
                        <button
                          onClick={() => removeAttachment(f.name)}
                          className="ml-1 text-muted-foreground hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSend}
                disabled={!message.trim() || !recipient.trim() || sending}
                className="w-full gap-2"
              >
                {sending ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Encrypting...</>
                ) : sent ? (
                  <><ShieldCheck className="h-4 w-4" /> Message Sent</>
                ) : (
                  <><Send className="h-4 w-4" /> Encrypt & Send</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — real-time analysis */}
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
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Detected Emotion</p>
                    <div className="flex items-center gap-2 mt-1">
                      <EmotionIcon className="h-4 w-4 text-primary" />
                      <span>{analysis.emotion}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Risk Level</p>
                    <Badge variant="outline" className={cn("mt-1", riskColors[analysis.risk])}>
                      {analysis.risk}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Encryption Tier</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold">{analysis.encryption}</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                    {analysis.emotion === "Positive" && "😊 Positive tone → AES-128 encryption applied"}
                    {analysis.emotion === "Neutral" && "😐 Neutral tone → AES-192 encryption applied"}
                    {analysis.emotion === "Negative" && "😠 Negative tone → AES-256 encryption applied"}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Start typing to see live sentiment analysis
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}