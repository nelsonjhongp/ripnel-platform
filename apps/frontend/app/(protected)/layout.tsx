import { SidebarShell } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedGuard } from "@/components/auth/ProtectedGuard"
import { VisualPreferencesProvider } from "@/components/appearance/VisualPreferencesProvider"
import { NotificationsProvider } from "@/components/notifications"
import { ChatbotLazy } from "@/components/chatbot/ChatbotLazy"

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
            <SidebarShell>{children}</SidebarShell>
            <ChatbotLazy />
          </NotificationsProvider>
        </SidebarProvider>
      </VisualPreferencesProvider>
    </ProtectedGuard>
  )
}
