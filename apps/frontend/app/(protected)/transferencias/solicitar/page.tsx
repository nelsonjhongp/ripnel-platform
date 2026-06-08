import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { TransfersRequestPage } from "@/components/modules/transfers/transfers-request-page"

export default function TransferRequestRoutePage() {
  return (
    <PermissionGuard anyPermissions={["transfers.manage", "transfers.request.create"]}>
      <TransfersRequestPage />
    </PermissionGuard>
  )
}
