"use client"

import type React from "react"
import { DashboardNav } from "./dashboard-nav"
import { MobileNav } from "./mobile-nav"
import { UserMenu } from "./user-menu"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardNav />
      </div>
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="flex items-center justify-end border-b border-border bg-background/80 px-4 py-3">
          <UserMenu />
        </div>
        {children}
      </main>
      <MobileNav />
    </div>
  )
}

