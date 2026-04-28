import { SidebarShell } from "@/components/sidebar"
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
        <SidebarShell>{children}</SidebarShell>
      </VisualPreferencesProvider>
    </ProtectedGuard>
  )
}
