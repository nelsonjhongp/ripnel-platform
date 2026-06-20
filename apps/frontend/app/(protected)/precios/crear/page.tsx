import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { PricesWorkspacePage } from "@/components/modules/pricing/prices-workspace-page"

export default function CrearPrecioPage() {
  return (
    <PermissionGuard permission="prices.manage">
      <PricesWorkspacePage />
    </PermissionGuard>
  )
}