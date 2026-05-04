import { notFound } from "next/navigation";
import { CatalogFormPage } from "@/components/modules/catalog-form-page";
import { catalogPageBySlug, getCatalogRoute } from "@/lib/product-master-metadata";

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ catalogId: string; itemId: string }>;
}) {
  const { catalogId, itemId } = await params;
  const page = catalogPageBySlug[catalogId];

  if (!page) {
    notFound();
  }

  return (
    <CatalogFormPage
      catalogLabel={page.label}
      catalogRoute={getCatalogRoute(page.slug)}
      endpoint={page.endpoint}
      fields={page.fields}
      idKey={page.idKey}
      duplicateStrategy={page.duplicateStrategy}
      mode="edit"
      itemId={itemId}
    />
  );
}
