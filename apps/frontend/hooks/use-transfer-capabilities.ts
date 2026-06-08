import { useMemo } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { resolveTransferCapabilities } from "@/lib/capabilities"

export function useTransferCapabilities() {
  const { permissions, user } = useAuth()

  return useMemo(
    () =>
      resolveTransferCapabilities({
        permissions,
        roleName: user?.role_name,
      }),
    [permissions, user?.role_name]
  )
}
