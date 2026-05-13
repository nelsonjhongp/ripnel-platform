import LocationsPage from "@/components/modules/administration/locations-page"
import { PermissionGuard } from "@/components/auth/PermissionGuard"

export default function Page() {
  return (
    <PermissionGuard permission="admin.manage">
      <LocationsPage />
    </PermissionGuard>
  )
}
