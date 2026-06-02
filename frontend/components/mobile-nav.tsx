"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PenLine, Inbox, Send, AlertOctagon, Trash2 } from "lucide-react"

const navItems = [
  { href: "/", label: "Compose", icon: PenLine },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/spam", label: "Spam", icon: AlertOctagon },
  { href: "/deleted", label: "Deleted", icon: Trash2 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-sidebar md:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
