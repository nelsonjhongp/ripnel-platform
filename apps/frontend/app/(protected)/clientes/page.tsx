import { PermissionGuard } from "@/components/auth/PermissionGuard";
import CustomersPage from "@/components/modules/customers/customers-page";

export default function Page() {
  return (
    <PermissionGuard permission="customers.manage">
      <CustomersPage />
    </PermissionGuard>
  );
}