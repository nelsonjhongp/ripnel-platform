import { PermissionGuard } from "@/components/auth/PermissionGuard"
import CashHistoryPage from "@/components/modules/cash/cash-history-page"

export default function Page() {
  return (
    <PermissionGuard permission="cash.view">
      <CashHistoryPage />
    </PermissionGuard>
  )
}