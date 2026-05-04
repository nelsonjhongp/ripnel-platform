import { notFound } from "next/navigation"
import { CatalogCrudPage } from "@/components/modules/catalog-crud-page"
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
    <CatalogCrudPage
      eyebrow="Catalogos"
      title={page.label}
      endpoint={page.endpoint}
      emptyTitle={page.emptyTitle}
      emptyDescription={page.emptyDescription}
      listFields={page.listFields}
      idKey={page.idKey}
      catalogRoute={getCatalogRoute(page.slug)}
    />
  )
}
