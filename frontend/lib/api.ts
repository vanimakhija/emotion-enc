import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") localStorage.removeItem("access_token")
      if (unauthorizedHandler) {
        unauthorizedHandler()
      } else if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authAPI = {
  register: async (email: string, password: string) => {
    const { data } = await api.post("/register", { email, password })
    return data
  },
  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; token_type: string }>("/login", { email, password })
    return data
  },
  me: async () => {
    const { data } = await api.get<{ id: number; email: string; created_at: string; gmail_connected: boolean }>("/me")
    return data
  },
}

// Message types
export interface MessageMeta {
  id: string
  sender_id: number
  recipient_id: number
  sender_email: string
  recipient_email: string
  recipient: string
  emotion: string
  risk: string
  encryption: string
  timestamp: string
  is_read: boolean
  created_at?: string
}

// Messages API
export const messagesAPI = {
  send: async (message: string, recipient: string) => {
    const { data } = await api.post<{
      message_id: string; emotion: string; risk: string; encryption: string
    }>("/send", { message, recipient })
    return data
  },
  inbox: async () => {
    const { data } = await api.get<MessageMeta[]>("/inbox")
    return data
  },
  sent: async () => {
    const { data } = await api.get<MessageMeta[]>("/sent")
    return data
  },
  getById: async (messageId: string) => {
    const { data } = await api.get<MessageMeta>(`/messages/${messageId}`)
    return data
  },
  decrypt: async (messageId: string) => {
    const { data } = await api.post<{ plaintext: string }>("/decrypt", { message_id: messageId })
    return data
  },
  markRead: async (messageId: string) => {
    const { data } = await api.patch(`/messages/${messageId}/read`)
    return data
  },
  list: async () => {
    const { data } = await api.get<MessageMeta[]>("/messages")
    return data
  },
}

// Analytics API
export const analyticsAPI = {
  emotions: async () => {
    const { data } = await api.get<Record<string, number>>("/analytics/emotions")
    return data
  },
}

// Gmail API
export interface GmailMessage {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
}

export const gmailAPI = {
  inbox: async () => {
    const { data } = await api.get<{ messages: GmailMessage[]; count: number }>("/gmail/inbox")
    return data
  },
}