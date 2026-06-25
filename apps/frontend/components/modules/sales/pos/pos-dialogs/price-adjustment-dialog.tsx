"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { ADJUSTMENT_REASON_PRESETS } from "../pos-types"
import type { CartItem, PreviewItem } from "../pos-types"
import { INPUT_CLASS, INFO_BOX_MUTED } from "../pos-constants"
import { formatMoney, parseAmountInput, trimOrNull } from "../pos-utils"
import { POS } from "../pos-messages"

export function PriceAdjustmentDialog({
  open,
  onOpenChange,
  item,
  previewItem,
  onClose,
  onConfirm,
  onClear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: CartItem | null
  previewItem: PreviewItem | null
  onClose: () => void
  onConfirm: (variantId: string, unitPriceFinal: number, reason: string) => void
  onClear: () => void
}) {
  const [price, setPrice] = useState("")
  const [reason, setReason] = useState("")
  const [priceError, setPriceError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void Promise.resolve().then(() => {
      setPrice(
        String(
          item?.price_override?.unit_price_final ??
            previewItem?.unit_price_list ??
            item?.wholesale_price ??
            item?.retail_price ??
            "",
        ),
      )
      setReason(item?.price_override?.reason || "")
      setPriceError(null)
      setReasonError(null)
    })
  }, [item, open, previewItem])

  function close() {
    onClose()
    onOpenChange(false)
  }

  function confirm() {
    if (!item) return
    const nextPrice = parseAmountInput(price)
    if (nextPrice === null) {
      setPriceError(POS.priceAdjust.priceError)
      setReasonError(null)
      return
    }
    const nextReason = trimOrNull(reason)
    if (!nextReason) {
      setPriceError(null)
      setReasonError(POS.priceAdjust.reasonError)
      return
    }
    setPriceError(null)
    setReasonError(null)
    onConfirm(item.variant_id, nextPrice, nextReason)
    close()
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title={POS.priceAdjust.title}
      description={item ? item.label : POS.priceAdjust.title}
      size="md"
      bodyClassName="space-y-3"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" className="rounded-lg px-4" onClick={onClear} disabled={!item?.price_override}>
            {POS.priceAdjust.clear}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close}>
              {POS.priceAdjust.cancel}
            </Button>
            <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={confirm}>
              {POS.priceAdjust.save}
            </Button>
          </div>
        </div>
      }
    >
      <div className={`${INFO_BOX_MUTED} text-sm`}>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--ops-text-muted)]">{POS.priceAdjust.listPrice}</span>
          <span className="font-semibold text-[var(--ops-text)]">
            {POS.summary.moneyPrefix} {formatMoney(previewItem?.unit_price_list ?? 0)}
          </span>
        </div>
      </div>
      <OpsFormField label={POS.priceAdjust.finalPrice} required error={priceError} density="compact">
        <input
          type="text"
          name="price_adjustment_unit_price"
          inputMode="decimal"
          autoComplete="off"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value)
            setPriceError(null)
          }}
          placeholder="0.00"
          className={INPUT_CLASS}
        />
      </OpsFormField>
      <PresetTextField
        label={POS.priceAdjust.reason}
        required
        error={reasonError}
        value={reason}
        onChange={(value) => {
          setReason(value)
          setReasonError(null)
        }}
        presets={ADJUSTMENT_REASON_PRESETS}
        placeholder={POS.priceAdjust.reasonPlaceholder}
        textareaRows={2}
        textareaClassName="min-h-[72px]"
      />
    </OpsDialog>
  )
}
