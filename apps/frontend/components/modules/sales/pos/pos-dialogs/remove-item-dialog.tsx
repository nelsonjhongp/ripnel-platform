"use client"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import type { CartItem } from "../pos-types"

export function RemoveItemDialog({
  open,
  onOpenChange,
  item,
  onClose,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: CartItem | null
  onClose: () => void
  onConfirm: () => void
}) {
  function close() {
    onClose()
    onOpenChange(false)
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title="Quitar producto"
      description={item?.label}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" className="rounded-lg px-4" onClick={onConfirm}>
            Quitar
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--ops-text-muted)]">
        El producto se retirará del carrito de esta venta.
      </p>
    </OpsDialog>
  )
}
