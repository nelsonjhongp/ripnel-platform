import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InventoryAdjustmentsPage } from "@/components/modules/inventory/inventory-adjustments-page"

export default function InventoryAdjustmentsRoute() {
  return (
    <PermissionGuard permission="inventory.view">
      <InventoryAdjustmentsPage />
    </PermissionGuard>
  )
}