import { PermissionGuard } from "@/components/auth/PermissionGuard"
import CashHistoryDetailPage from "@/components/modules/cash/cash-history-detail-page"

type CashHistoryDetailRouteProps = {
  params: Promise<{ id: string }>
}

export default function Page(props: CashHistoryDetailRouteProps) {
  return (
    <PermissionGuard permission="cash.view">
      <CashHistoryDetailPage {...props} />
    </PermissionGuard>
  )
}