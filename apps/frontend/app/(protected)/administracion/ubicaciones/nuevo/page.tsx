import { PermissionGuard } from "@/components/auth/PermissionGuard"
import LocationsCreatePage from "@/components/modules/administration/locations-create-page"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <LocationsCreatePage />
    </PermissionGuard>
  )
}
