import { PermissionGuard } from "@/components/auth/PermissionGuard"
import InventoryPage from "@/components/modules/inventory/inventory-page"

export default function Page() {
  return (
    <PermissionGuard permission="inventory.view">
      <InventoryPage />
    </PermissionGuard>
  )
}