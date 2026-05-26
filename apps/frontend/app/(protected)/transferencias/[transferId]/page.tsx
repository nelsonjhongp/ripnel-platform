import { notFound } from "next/navigation"
import { TransfersRequestPage } from "@/components/modules/transfers/transfers-request-page"
import { TransferDetailPage } from "@/components/modules/transfers/transfers-detail-page"
import { TransfersListPage } from "@/components/modules/transfers/transfers-list-page"
import { TransfersPendingPage } from "@/components/modules/transfers/transfers-pending-page"
import { transferRouteSlugs } from "@/lib/routes"

export default async function TransferPage({
  params,
}: {
  params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params

  if (transferId === transferRouteSlugs.list) {
    return <TransfersListPage />
  }

  if (transferId === transferRouteSlugs.create) {
    notFound()
  }

  if (transferId === transferRouteSlugs.requestProducts) {
    return <TransfersRequestPage />
  }

  if (transferId === transferRouteSlugs.pendingReceipts) {
    return <TransfersPendingPage />
  }

  if (transferId) {
    return <TransferDetailPage params={params} />
  }

  notFound()
}
