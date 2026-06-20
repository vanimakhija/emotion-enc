"use client"

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { authAPI, setUnauthorizedHandler } from "@/lib/api"

type UserProfile = {
  id: number
  email: string
  created_at: string
  gmail_connected: boolean
}

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  loading: boolean
  login: (token: string) => void
  logout: () => void
  fetchProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const logout = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem("access_token")
    setUser(null)
    setIsAuthenticated(false)
    router.push("/login")
  }, [router])

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await authAPI.me()
      setUser(profile)
      setIsAuthenticated(true)
    } catch {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(
    (token: string) => {
      if (typeof window !== "undefined") localStorage.setItem("access_token", token)
      setIsAuthenticated(true)
      void fetchProfile()
    },
    [fetchProfile]
  )

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (token) void fetchProfile()
    else setLoading(false)
  }, [fetchProfile])

  useEffect(() => {
    setUnauthorizedHandler(() => logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value: AuthContextType = { user, isAuthenticated, loading, login, logout, fetchProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}