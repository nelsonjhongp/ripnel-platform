import { PermissionGuard } from "@/components/auth/PermissionGuard"
import InventoryDetailPage from "@/components/modules/inventory/inventory-detail-page"

export default function Page() {
  return (
    <PermissionGuard permission="inventory.view">
      <InventoryDetailPage />
    </PermissionGuard>
  )
}