import { SidebarShell } from "@/components/sidebar"
import { ProtectedGuard } from "@/components/auth/ProtectedGuard"

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedGuard>
      <SidebarShell>{children}</SidebarShell>
    </ProtectedGuard>
  )
}
