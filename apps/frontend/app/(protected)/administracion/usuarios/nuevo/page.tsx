import { PermissionGuard } from "@/components/auth/PermissionGuard"
import UsersCreatePage from "@/components/modules/administration/users-create-page"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <UsersCreatePage />
    </PermissionGuard>
  )
}
