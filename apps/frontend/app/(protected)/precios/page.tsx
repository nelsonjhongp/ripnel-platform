import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { PricesOverviewPage } from "@/components/modules/pricing/prices-overview-page"

export default function PreciosPage() {
  return (
    <PermissionGuard permission="prices.manage">
      <PricesOverviewPage />
    </PermissionGuard>
  )
}