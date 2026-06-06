import { PermissionGuard } from "@/components/auth/PermissionGuard"
import RolesCreatePage from "@/components/modules/administration/roles-create-page"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <RolesCreatePage />
    </PermissionGuard>
  )
}
