"use client"

import { useSyncExternalStore } from "react"
import { getMessages, subscribe } from "@/lib/message-store"

export function useMessages() {
  return useSyncExternalStore(subscribe, getMessages, getMessages)
}
