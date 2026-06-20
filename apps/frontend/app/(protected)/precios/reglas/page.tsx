import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { PricingRulesPage } from "@/components/modules/pricing/pricing-rules-page"

export default function ReglasPrecioPage() {
  return (
    <PermissionGuard permission="prices.manage">
      <PricingRulesPage />
    </PermissionGuard>
  )
}