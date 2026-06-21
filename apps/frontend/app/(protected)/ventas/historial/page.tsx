import { PermissionGuard } from "@/components/auth/PermissionGuard"
import TransactionHistoryPage from "@/components/modules/sales/transaction-history-page"

export default function Page() {
  return (
    <PermissionGuard permission="sales.pos">
      <TransactionHistoryPage />
    </PermissionGuard>
  )
}