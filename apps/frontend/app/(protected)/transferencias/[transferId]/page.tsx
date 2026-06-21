import { notFound, redirect } from "next/navigation"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { TransferDetailPage } from "@/components/modules/transfers/transfers-detail-page"
import { appRoutes, transferRouteSlugs } from "@/lib/routes"

export default async function TransferPage({
  params,
}: {
  params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params

  if (transferId === transferRouteSlugs.list) {
    redirect(appRoutes.transfers)
  }

  if (transferId === transferRouteSlugs.create) {
    notFound()
  }

  if (transferId === transferRouteSlugs.requestProducts) {
    redirect(appRoutes.transferRequest)
  }

  if (transferId === transferRouteSlugs.pendingReceipts) {
    redirect(appRoutes.transferPendingReceipts)
  }

  if (transferId) {
    return (
      <PermissionGuard anyPermissions={["transfers.manage", "transfers.request.view_own"]}>
        <TransferDetailPage params={params} />
      </PermissionGuard>
    )
  }

  notFound()
}
