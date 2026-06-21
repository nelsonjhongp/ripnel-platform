import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { TransfersHistoryPage } from "@/components/modules/transfers/transfers-history-page";

export default function TransfersHistoryRoutePage() {
  return (
    <PermissionGuard anyPermissions={["transfers.manage", "transfers.request.view_own"]}>
      <TransfersHistoryPage />
    </PermissionGuard>
  );
}