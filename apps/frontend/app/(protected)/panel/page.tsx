import { PermissionGuard } from "@/components/auth/PermissionGuard"
import DashboardPage from "@/components/modules/dashboard/dashboard-page"

export default function Page() {
  return (
    <PermissionGuard permission="dashboard.view">
      <DashboardPage />
    </PermissionGuard>
  )
}
