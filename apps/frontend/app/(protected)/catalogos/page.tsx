import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { CatalogHubPage } from "@/components/modules/catalogs/catalog-hub-page"

export default function CatalogsPage() {
  return (
    <PermissionGuard permission="catalogs.manage">
      <CatalogHubPage />
    </PermissionGuard>
  )
}