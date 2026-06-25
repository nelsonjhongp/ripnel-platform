"use client"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { POS } from "../pos-messages"
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
      title={POS.removeItem.title}
      description={item?.label ?? POS.removeItem.title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close}>
            {POS.removeItem.cancel}
          </Button>
          <Button type="button" variant="destructive" size="sm" className="rounded-lg px-4" onClick={onConfirm}>
            {POS.removeItem.confirm}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--ops-text-muted)]">
        {POS.removeItem.desc}
      </p>
    </OpsDialog>
  )
}
