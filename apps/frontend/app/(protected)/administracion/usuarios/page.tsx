import UsersPage from "@/components/modules/administration/users-page"
import { PermissionGuard } from "@/components/auth/PermissionGuard"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <UsersPage />
    </PermissionGuard>
  )
}
