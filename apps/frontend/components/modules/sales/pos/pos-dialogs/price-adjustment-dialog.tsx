"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { ADJUSTMENT_REASON_PRESETS } from "../pos-types"
import type { CartItem, PreviewItem } from "../pos-types"
import { INPUT_CLASS } from "../pos-constants"
import { formatMoney, parseAmountInput, trimOrNull } from "../pos-utils"

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
      setPriceError("Ingresa un precio final valido.")
      setReasonError(null)
      return
    }
    const nextReason = trimOrNull(reason)
    if (!nextReason) {
      setPriceError(null)
      setReasonError("Ingresa el motivo del ajuste.")
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
      title="Ajuste de precio"
      description={item ? item.label : undefined}
      size="md"
      bodyClassName="space-y-3"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" className="rounded-lg px-4" onClick={onClear} disabled={!item?.price_override}>
            Limpiar ajuste
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={confirm}>
              Guardar ajuste
            </Button>
          </div>
        </div>
      }
    >
      <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-[var(--ops-text-muted)]">Precio lista</span>
          <span className="font-semibold text-[var(--ops-text)]">
            S/. {formatMoney(previewItem?.unit_price_list ?? 0)}
          </span>
        </div>
      </div>
      <OpsFormField label="Precio final" required error={priceError} density="compact">
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
        label="Motivo"
        required
        error={reasonError}
        value={reason}
        onChange={(value) => {
          setReason(value)
          setReasonError(null)
        }}
        presets={ADJUSTMENT_REASON_PRESETS}
        placeholder="Selecciona el motivo"
        textareaRows={2}
        textareaClassName="min-h-[72px]"
      />
    </OpsDialog>
  )
}
