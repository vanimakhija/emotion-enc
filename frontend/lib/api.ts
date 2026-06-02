import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = "http://localhost:8000"

// Optional global unauthorized handler; set from AuthContext so we can
// centralize logout behavior when a 401 is returned.
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor: attach JWT token from localStorage
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

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Remove invalid/expired token
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
      }

      if (unauthorizedHandler) {
        unauthorizedHandler()
      } else if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        // Fallback redirect if no handler is registered
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: async (email: string, password: string) => {
    const { data } = await api.post("/register", { email, password })
    return data
  },
  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; token_type: string }>("/login", {
      email,
      password,
    })
    return data
  },
  me: async () => {
    const { data } = await api.get<{
      id: number
      email: string
      created_at: string
    }>("/me")
    return data
  },
}

// Messages API
export const messagesAPI = {
  send: async (message: string, recipient: string) => {
    const { data } = await api.post<{
      message_id: string
      emotion: string
      risk: string
      encryption: string
    }>("/send", { message, recipient })
    return data
  },
  inbox: async () => {
    const { data } = await api.get<
      Array<{
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
      }>
    >("/inbox")
    return data
  },
  sent: async () => {
    const { data } = await api.get<
      Array<{
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
      }>
    >("/sent")
    return data
  },
  decrypt: async (messageId: string) => {
    const { data } = await api.post<{ plaintext: string }>("/decrypt", {
      message_id: messageId,
    })
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
    const { data } = await api.get<{
      messages: GmailMessage[]
      count: number
    }>("/gmail/inbox")
    return data
  },
}

