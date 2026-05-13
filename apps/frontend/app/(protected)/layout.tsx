import { SidebarShell } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedGuard } from "@/components/auth/ProtectedGuard"
import { VisualPreferencesProvider } from "@/components/appearance/VisualPreferencesProvider"
import { NotificationsProvider } from "@/components/notifications"

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
          </NotificationsProvider>
        </SidebarProvider>
      </VisualPreferencesProvider>
    </ProtectedGuard>
  )
}
