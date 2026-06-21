import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ProductCreatePage } from "@/components/modules/products/product-create-page";

export default function NewProductPage() {
  return (
    <PermissionGuard permission="products.manage">
      <ProductCreatePage />
    </PermissionGuard>
  );
}