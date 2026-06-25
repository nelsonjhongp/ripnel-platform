import { PermissionGuard } from "@/components/auth/PermissionGuard"
import NuevaVentaPage from "@/components/modules/sales/pos/pos-page"

export default function Page() {
  return (
    <PermissionGuard permission="sales.pos">
      <NuevaVentaPage />
    </PermissionGuard>
  )
}