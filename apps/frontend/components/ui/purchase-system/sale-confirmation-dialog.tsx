"use client"

import Link from "next/link"
import { CheckCircle2, FileText, Printer, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { buildSaleDetailRoute } from "@/lib/routes"
import { formatMoney } from "@/lib/format-utils"
import type { ConfirmedSale } from "@/components/modules/sales/pos/pos-types"

export function SaleConfirmationDialog({
  open,
  onOpenChange,
  sale,
  canOpenPostsale,
  onNewSale,
  onPrint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: ConfirmedSale | null
  canOpenPostsale: boolean
  onNewSale: () => void
  onPrint: () => void
}) {
  return (
    <OpsDialog
      open={open && Boolean(sale)}
      onOpenChange={onOpenChange}
      title="Venta confirmada"
      description={sale?.sale_number ? `Comprobante interno ${sale.sale_number}` : undefined}
      size="md"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={onNewSale}>
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva venta
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={onPrint}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
            {sale?.sale_id ? (
              <Button asChild type="button" variant="accent" size="sm" className="rounded-lg px-4">
                <Link href={buildSaleDetailRoute(sale.sale_id)}>
                  <FileText className="h-3.5 w-3.5" />
                  Ver detalle
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ops-tone-success-text)]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ops-text)]">
            {sale?.customer_name || "Venta registrada correctamente"}
          </p>
          <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
            {sale?.total != null ? `Total S/. ${formatMoney(sale.total)}` : "La operación quedó guardada."}
          </p>
        </div>
      </div>

      {sale?.item_preview_labels?.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Items
          </p>
          <div className="space-y-1">
            {sale.item_preview_labels.slice(0, 4).map((label) => (
              <p key={label} className="truncate text-sm text-[var(--ops-text)]">
                {label}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {!canOpenPostsale ? (
        <p className="text-xs text-[var(--ops-text-muted)]">
          Tu rol no tiene acceso directo a postventa desde esta confirmación.
        </p>
      ) : null}
    </OpsDialog>
  )
}
