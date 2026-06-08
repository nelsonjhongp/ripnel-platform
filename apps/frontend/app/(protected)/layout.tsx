import { SidebarShell } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedGuard } from "@/components/auth/ProtectedGuard"
import { VisualPreferencesProvider } from "@/components/appearance/VisualPreferencesProvider"
import { NotificationsProvider } from "@/components/notifications"
import { ChatbotLazy } from "@/components/chatbot/ChatbotLazy"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { CommandPalette } from "@/components/ui/command-palette"

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedGuard>
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
    </ProtectedGuard>
  )
}
