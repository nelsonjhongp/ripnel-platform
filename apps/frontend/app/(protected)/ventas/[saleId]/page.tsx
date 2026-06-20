import { PermissionGuard } from "@/components/auth/PermissionGuard"
import SaleDetailPage from "@/components/modules/sales/sale-detail-page"

type SaleDetailRouteProps = {
  params: Promise<{ saleId: string }>
}

export default function Page(props: SaleDetailRouteProps) {
  return (
    <PermissionGuard permission="sales.pos">
      <SaleDetailPage {...props} />
    </PermissionGuard>
  )
}