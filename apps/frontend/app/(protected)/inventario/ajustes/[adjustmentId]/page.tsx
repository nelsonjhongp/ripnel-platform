import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InventoryAdjustmentsDetailPage } from "@/components/modules/inventory/adjustments-detail-page"

export default function InventoryAdjustmentsDetailRoute() {
  return (
    <PermissionGuard permission="inventory.adjust">
      <InventoryAdjustmentsDetailPage />
    </PermissionGuard>
  )
}
