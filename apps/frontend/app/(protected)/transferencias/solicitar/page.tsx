import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { TransfersRequestPage } from "@/components/modules/transfers/transfers-request-page"

export default function TransferRequestRoutePage() {
  return (
    <PermissionGuard permission="transfers.manage">
      <TransfersRequestPage />
    </PermissionGuard>
  )
}
