import { ProtectedGuard } from "@/components/auth/ProtectedGuard"
import { ProtectedAppFrame } from "@/components/auth/ProtectedAppFrame"

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProtectedGuard>
      <ProtectedAppFrame>{children}</ProtectedAppFrame>
    </ProtectedGuard>
  )
}
