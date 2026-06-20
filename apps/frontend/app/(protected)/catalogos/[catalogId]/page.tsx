import { notFound } from "next/navigation"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { CatalogCrudPage } from "@/components/modules/catalogs/catalog-crud-page"
import { catalogPageBySlug, getCatalogRoute } from "@/lib/product-master-metadata"

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ catalogId: string }>
}) {
  const { catalogId } = await params
  const page = catalogPageBySlug[catalogId]

  if (!page) {
    notFound()
  }

  return (
    <PermissionGuard permission="catalogs.manage">
      <CatalogCrudPage
        eyebrow="Catálogos"
        title={page.label}
        endpoint={page.endpoint}
        emptyTitle={page.emptyTitle}
        emptyDescription={page.emptyDescription}
        listFields={page.listFields}
        fields={page.fields}
        idKey={page.idKey}
        catalogRoute={getCatalogRoute(page.slug)}
        entityLabel={page.entityLabel}
        duplicateStrategy={page.duplicateStrategy}
      />
    </PermissionGuard>
  )
}
