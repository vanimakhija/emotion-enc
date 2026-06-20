"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { Shield, PenLine, Inbox, Send, Lock, LogOut, Mail, BarChart2, User } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Compose", icon: PenLine },
  { href: "/inbox", label: "Encrypted Inbox", icon: Inbox },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/gmail-inbox", label: "Gmail Inbox", icon: Mail },
  { href: "/profile", label: "Profile", icon: User },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">EAAE</span>
          <span className="text-xs text-muted-foreground">Adaptive Encryption</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <span className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Navigation
        </span>
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        {user && (
          <p className="truncate px-1 text-xs text-muted-foreground">{user.email}</p>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">End-to-End Encrypted</span>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Logout</span>
        </Button>
      </div>
    </aside>
  )
}