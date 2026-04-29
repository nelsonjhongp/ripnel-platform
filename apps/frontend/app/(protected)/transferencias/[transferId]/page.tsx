import { notFound } from "next/navigation"
import { TransfersCreatePage } from "@/components/modules/transfers-create-page"
import { TransfersListPage } from "@/components/modules/transfers-list-page"
import { TransfersPendingPage } from "@/components/modules/transfers-pending-page"

export default async function TransferPage({
  params,
}: {
  params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params

  if (transferId === "listado-de-transferencias") {
    return <TransfersListPage />
  }

  if (transferId === "crear-transferencia") {
    return <TransfersCreatePage />
  }

  if (transferId === "solicitar-productos") {
    return <TransfersCreatePage />
  }

  if (transferId === "recepciones-pendientes") {
    return <TransfersPendingPage />
  }

  notFound()
}
