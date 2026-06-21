import { PermissionGuard } from "@/components/auth/PermissionGuard"
import KardexPage from "@/components/modules/kardex/kardex-page"

export default function InventoryMovementsPage() {
  return (
    <PermissionGuard permission="inventory.view">
      <KardexPage />
    </PermissionGuard>
  )
}