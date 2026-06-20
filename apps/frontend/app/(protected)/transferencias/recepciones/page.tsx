import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { TransfersPendingPage } from "@/components/modules/transfers/transfers-pending-page"

export default function TransferPendingReceiptsRoutePage() {
  return (
    <PermissionGuard anyPermissions={["transfers.manage", "transfers.receive"]}>
      <TransfersPendingPage />
    </PermissionGuard>
  )
}