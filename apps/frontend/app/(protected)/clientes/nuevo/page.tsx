import { PermissionGuard } from "@/components/auth/PermissionGuard"
import CustomersCreatePage from "@/components/modules/customers/customers-create-page"

export default function Page() {
  return (
    <PermissionGuard anyPermissions={["customers.manage"]}>
      <CustomersCreatePage />
    </PermissionGuard>
  )
}
