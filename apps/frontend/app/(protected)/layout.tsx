import { SidebarShell } from "@/components/sidebar"

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SidebarShell>{children}</SidebarShell>
}
