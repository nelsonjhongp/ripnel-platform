import { Suspense } from "react"
import { InventoryAdjustmentsPage } from "@/components/modules/inventory/inventory-adjustments-page"

export default function InventoryAdjustmentsRoute() {
  return (
    <Suspense>
      <InventoryAdjustmentsPage />
    </Suspense>
  )
}
