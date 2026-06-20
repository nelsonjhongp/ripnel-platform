import { PermissionGuard } from "@/components/auth/PermissionGuard"
import CashControlPage from "@/components/modules/cash/cash-control-page"

export default function Page() {
  return (
    <PermissionGuard permission="cash.admin.view">
      <CashControlPage />
    </PermissionGuard>
  )
}