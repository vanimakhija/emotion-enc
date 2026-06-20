"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ModelResult {
  emotion: string
  risk: string
  encryption: string
}

interface CompareResult {
  vader: ModelResult
  ml_model: ModelResult
  agreement: boolean
}

const emotionColor: Record<string, string> = {
  Positive: "text-emerald-400",
  Neutral: "text-amber-400",
  Negative: "text-red-400",
}

/**
 * Side-by-side comparison of VADER (rule-based) vs a trained TF-IDF +
 * Logistic Regression classifier on the same message. Drop this into the
 * compose page alongside the existing real-time analysis panel to show
 * the data-science angle of the project during a demo.
 */
export function ModelCompareCard({ message }: { message: string }) {
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const runCompare = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.trim().length < 3) {
      setResult(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/analyze-compare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        })
        if (res.ok) setResult(await res.json())
      } catch {
        // Comparison is a nice-to-have for the demo; fail silently
      } finally {
        setLoading(false)
      }
    }, 600)
  }, [])

  // Call this from the parent whenever the message text changes:
  // useEffect(() => { runCompare(message) }, [message, runCompare])

  if (!result) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Model Comparison
          {result.agreement ? (
            <Badge variant="outline" className="ml-auto gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Models Agree
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400">
              <XCircle className="h-3 w-3" /> Models Disagree
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Brain className="h-3 w-3" /> VADER (Rule-Based)
          </span>
          <span className={cn("text-sm font-semibold", emotionColor[result.vader.emotion])}>
            {result.vader.emotion}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{result.vader.encryption}</span>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Trained Model
          </span>
          <span className={cn("text-sm font-semibold", emotionColor[result.ml_model.emotion])}>
            {result.ml_model.emotion}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{result.ml_model.encryption}</span>
        </div>
      </CardContent>
    </Card>
  )
}