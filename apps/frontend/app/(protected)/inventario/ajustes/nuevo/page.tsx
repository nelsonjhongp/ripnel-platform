import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InventoryAdjustmentsCreatePage } from "@/components/modules/inventory/inventory-adjustments-create-page"

export default function InventoryAdjustmentsCreateRoute() {
  return (
    <PermissionGuard permission="inventory.adjust">
      <InventoryAdjustmentsCreatePage />
    </PermissionGuard>
  )
}
