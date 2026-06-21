import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ProductsOverviewPage } from "@/components/modules/products/products-overview-page";

export default function ProductsPage() {
  return (
    <PermissionGuard permission="products.manage">
      <ProductsOverviewPage />
    </PermissionGuard>
  );
}