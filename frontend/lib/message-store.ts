export type Emotion = "happy" | "sad" | "angry" | "fearful" | "neutral" | "anxious"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export type EncryptionType = "AES-128" | "AES-192" | "AES-256"

export type Folder = "inbox" | "sent" | "spam" | "deleted"

export interface AnalysisResult {
  emotion: Emotion
  risk: RiskLevel
  encryption: EncryptionType
}

export interface Message {
  id: string
  recipient: string
  ciphertext: string
  plaintext: string
  emotion: Emotion
  risk: RiskLevel
  encryption: EncryptionType
  timestamp: string
  folder: Folder
}

const emotionKeywords: Record<string, Emotion> = {
  happy: "happy",
  love: "happy",
  great: "happy",
  wonderful: "happy",
  amazing: "happy",
  excited: "happy",
  joy: "happy",
  sad: "sad",
  sorry: "sad",
  miss: "sad",
  depressed: "sad",
  cry: "sad",
  upset: "sad",
  angry: "angry",
  hate: "angry",
  furious: "angry",
  rage: "angry",
  mad: "angry",
  fear: "fearful",
  scared: "fearful",
  afraid: "fearful",
  terrified: "fearful",
  worry: "anxious",
  anxious: "anxious",
  nervous: "anxious",
  stress: "anxious",
  panic: "anxious",
}

const riskMap: Record<Emotion, RiskLevel> = {
  neutral: "low",
  happy: "low",
  sad: "medium",
  anxious: "medium",
  angry: "high",
  fearful: "critical",
}

const encryptionMap: Record<RiskLevel, EncryptionType> = {
  low: "AES-128",
  medium: "AES-192",
  high: "AES-256",
  critical: "AES-256",
}

export function analyzeEmotion(text: string): AnalysisResult {
  const lower = text.toLowerCase()
  let detectedEmotion: Emotion = "neutral"

  for (const [keyword, emotion] of Object.entries(emotionKeywords)) {
    if (lower.includes(keyword)) {
      detectedEmotion = emotion
      break
    }
  }

  const risk = riskMap[detectedEmotion]
  const encryption = encryptionMap[risk]

  return { emotion: detectedEmotion, risk, encryption }
}

function simpleEncrypt(text: string): string {
  const encoded = btoa(
    Array.from(new TextEncoder().encode(text))
      .map((b) => String.fromCharCode(b))
      .join("")
  )
  return encoded.match(/.{1,4}/g)?.join("-") ?? encoded
}

function simpleDecrypt(cipher: string): string {
  const cleaned = cipher.replace(/-/g, "")
  const decoded = atob(cleaned)
  return new TextDecoder().decode(
    Uint8Array.from(decoded, (c) => c.charCodeAt(0))
  )
}

let messages: Message[] = [
  {
    id: "MSG-0A7F",
    recipient: "alice@shield.io",
    ciphertext: simpleEncrypt("Hello Alice!"),
    plaintext: "Hello Alice!",
    emotion: "happy",
    risk: "low",
    encryption: "AES-128",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    folder: "inbox",
  },
  {
    id: "MSG-1B3E",
    recipient: "bob@fortress.net",
    ciphertext: simpleEncrypt("I was furious about the breach"),
    plaintext: "I was furious about the breach",
    emotion: "angry",
    risk: "high",
    encryption: "AES-256",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    folder: "sent",
  },
  {
    id: "MSG-2C9D",
    recipient: "charlie@vault.dev",
    ciphertext: simpleEncrypt("I love the firewall"),
    plaintext: "I love the firewall",
    emotion: "happy",
    risk: "low",
    encryption: "AES-128",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    folder: "inbox",
  },
  {
    id: "MSG-3D5A",
    recipient: "diana@cipher.org",
    ciphertext: simpleEncrypt("I'm afraid we lost the handler"),
    plaintext: "I'm afraid we lost the handler",
    emotion: "fearful",
    risk: "critical",
    encryption: "AES-256",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    folder: "inbox",
  },
]

let snapshot = [...messages]

let listeners: (() => void)[] = []

export function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function notify() {
  snapshot = [...messages]
  listeners.forEach((l) => l())
}

export function getMessages(): Message[] {
  return snapshot
}

export function addMessage(recipient: string, plaintext: string): Message {
  const analysis = analyzeEmotion(plaintext)
  const id = `MSG-${Math.random().toString(16).slice(2, 6).toUpperCase()}`
  const msg: Message = {
    id,
    recipient,
    ciphertext: simpleEncrypt(plaintext),
    plaintext,
    emotion: analysis.emotion,
    risk: analysis.risk,
    encryption: analysis.encryption,
    timestamp: new Date().toISOString(),
    folder: "sent",
  }
  messages = [msg, ...messages]
  notify()
  return msg
}

export function moveToFolder(id: string, folder: Folder): void {
  messages = messages.map((m) => (m.id === id ? { ...m, folder } : m))
  notify()
}

export function getMessagesByFolder(folder: Folder): Message[] {
  return snapshot.filter((m) => m.folder === folder)
}

export function decryptMessage(id: string): string | null {
  const msg = messages.find((m) => m.id === id)
  if (!msg) return null
  try {
    return simpleDecrypt(msg.ciphertext)
  } catch {
    return msg.plaintext
  }
}
