"use client"

import type { ReactNode } from "react"

import { ChatbotLazy } from "@/components/chatbot/ChatbotLazy"
import { VisualPreferencesProvider } from "@/components/appearance/VisualPreferencesProvider"
import { NotificationsProvider } from "@/components/notifications"
import { SidebarShell } from "@/components/sidebar"
import { CommandPalette } from "@/components/ui/command-palette"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { SidebarProvider } from "@/components/ui/sidebar"

export function ProtectedAppFrame({ children }: { children: ReactNode }) {
  return (
    <VisualPreferencesProvider>
      <SidebarProvider>
        <NotificationsProvider>
          <ErrorBoundary>
            <SidebarShell>{children}</SidebarShell>
            <CommandPalette />
          </ErrorBoundary>
          <ChatbotLazy />
        </NotificationsProvider>
      </SidebarProvider>
    </VisualPreferencesProvider>
  )
}
