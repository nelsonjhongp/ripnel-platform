import SaleDetailPage from "@/components/modules/sales/sale-detail-page"

type SaleDetailRouteProps = {
  params: Promise<{ saleId: string }>
}

export default function Page(props: SaleDetailRouteProps) {
  return <SaleDetailPage {...props} />
}
