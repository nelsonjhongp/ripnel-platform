"use client"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { INFO_BOX_MUTED } from "../pos-constants"
import { POS } from "../pos-messages"
import type { PosContext } from "../pos-types"

type CashLocation = {
  name?: string | null
}

function buildLocationDescription(template: string, locationName?: string | null) {
  return locationName ? template.replace("{location}", locationName) : undefined
}

export function CashOpenDialog({
  open,
  onOpenChange,
  location,
  posContext,
  opening,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: CashLocation | null
  posContext?: PosContext | null
  opening: boolean
  onConfirm: () => void
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={POS.cash.openTitle}
      description={buildLocationDescription(POS.cash.openDesc, location?.name) ?? POS.cash.openTitle}
      size="sm"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={() => onOpenChange(false)}
            disabled={opening}
          >
            {POS.cash.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={onConfirm}
            disabled={opening}
          >
            {opening ? POS.cash.openLoading : POS.cash.openTitle}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={INFO_BOX_MUTED}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ops-text-muted)]">{POS.cash.location}</span>
            <span className="text-sm font-medium text-[var(--ops-text)]">
              {location?.name || POS.detailFallback.dash}
            </span>
          </div>
          {posContext?.business_date ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--ops-text-muted)]">{POS.cash.businessDate}</span>
              <span className="text-sm font-medium text-[var(--ops-text)]">
                {posContext.business_date}
              </span>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-[var(--ops-text-muted)]">{POS.cash.openHint}</p>
      </div>
    </OpsDialog>
  )
}
