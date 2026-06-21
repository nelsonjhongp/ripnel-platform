import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { TransfersListPage } from "@/components/modules/transfers/transfers-list-page"

export default function TransfersPage() {
  return (
    <PermissionGuard anyPermissions={["transfers.manage", "transfers.request.view_own"]}>
      <TransfersListPage />
    </PermissionGuard>
  )
}