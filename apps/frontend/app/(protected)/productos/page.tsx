import { ProductsOverviewPage } from "@/components/modules/products/products-overview-page";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ crear?: string | string[]; nuevo?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const createParam = resolvedSearchParams.crear ?? resolvedSearchParams.nuevo;
  const initialCreateOpen = Array.isArray(createParam)
    ? createParam[0] === "1"
    : createParam === "1";

  return <ProductsOverviewPage initialCreateOpen={initialCreateOpen} />;
}
