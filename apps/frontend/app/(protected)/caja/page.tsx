import { PermissionGuard } from "@/components/auth/PermissionGuard"
import CajaPage from "@/components/modules/cash/cash-page"

export default function Page() {
  return (
    <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
      <CajaPage />
    </PermissionGuard>
  )
}