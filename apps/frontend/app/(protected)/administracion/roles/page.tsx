import RolesPage from "@/components/modules/administration/roles-page"
import { PermissionGuard } from "@/components/auth/PermissionGuard"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <RolesPage />
    </PermissionGuard>
  )
}
