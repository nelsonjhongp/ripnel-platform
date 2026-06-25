import { notFound } from "next/navigation";
import { CatalogFormPage } from "@/components/modules/catalogs/catalog-form-page";
import { catalogPageBySlug, getCatalogRoute } from "@/lib/product-master-metadata";

export default async function NewCatalogItemPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId } = await params;
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
      duplicateStrategy={page.duplicateStrategy}
    />
  );
}
