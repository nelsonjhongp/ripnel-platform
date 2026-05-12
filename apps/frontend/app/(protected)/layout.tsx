import { SidebarShell } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedGuard } from "@/components/auth/ProtectedGuard"
import { VisualPreferencesProvider } from "@/components/appearance/VisualPreferencesProvider"

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedGuard>
      <VisualPreferencesProvider>
        <SidebarProvider>
          <SidebarShell>{children}</SidebarShell>
        </SidebarProvider>
      </VisualPreferencesProvider>
    </ProtectedGuard>
  )
}
