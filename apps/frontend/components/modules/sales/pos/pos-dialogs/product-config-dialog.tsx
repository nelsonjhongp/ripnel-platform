"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { formatMoney } from "@/lib/format-utils"
import type { EffectivePriceMode, SaleVariant, SearchableStyle } from "../pos-types"
import { INFO_BOX, MUTED_SURFACE_MIX } from "../pos-constants"
import { findVariantByAttributes, getVariantOptionValues } from "../pos-search-utils"
import { POS } from "../pos-messages"

const PANEL_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] w-[52px] shrink-0"
const PANEL_VALUE = "text-sm font-medium text-[var(--ops-text)]"
const PANEL_PLACEHOLDER = "text-sm text-[var(--ops-text-muted)]"

function panelRow(label: string, children: ReactNode) {
  return (
    <div className="flex items-center gap-2">
      <span className={PANEL_LABEL}>{label}</span>
      {children}
    </div>
  )
}

export function ProductConfigDialog({
  open,
  onOpenChange,
  style,
  effectivePriceMode,
  onClose,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  style: SearchableStyle | null
  effectivePriceMode: EffectivePriceMode
  onClose: () => void
  onConfirm: (variant: SaleVariant, quantity?: number) => void
}) {
  const [sizeCode, setSizeCode] = useState("")
  const [colorCode, setColorCode] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [addedCount, setAddedCount] = useState(0)
  const previousOpenRef = useRef(false)
  const previousStyleIdRef = useRef<string | null>(null)

  const allSizeOptions = useMemo(
    () => getVariantOptionValues(style?.variants || [], "size_code"),
    [style?.variants],
  )
  const allColorOptions = useMemo(
    () => getVariantOptionValues(style?.variants || [], "color_code"),
    [style?.variants],
  )
  const initialSizeCode = allSizeOptions.length === 1 ? allSizeOptions[0] : ""
  const initialColorCode = allColorOptions.length === 1 ? allColorOptions[0] : ""

  const sizeOptions = useMemo(
    () =>
      getVariantOptionValues(
        style?.variants || [],
        "size_code",
        colorCode ? { color_code: colorCode } : {},
      ),
    [colorCode, style?.variants],
  )
  const colorOptions = useMemo(
    () =>
      getVariantOptionValues(
        style?.variants || [],
        "color_code",
        sizeCode ? { size_code: sizeCode } : {},
      ),
    [sizeCode, style?.variants],
  )
  const selectedVariant = useMemo(
    () => findVariantByAttributes(style?.variants || [], sizeCode, colorCode),
    [colorCode, sizeCode, style?.variants],
  )

  useEffect(() => {
    const currentStyleId = style?.style_id || null
    const wasOpen = previousOpenRef.current
    const previousStyleId = previousStyleIdRef.current

    if (open && style && (!wasOpen || previousStyleId !== currentStyleId)) {
      void Promise.resolve().then(() => {
        setSizeCode(initialSizeCode)
        setColorCode(initialColorCode)
        setQuantity(1)
        setAddedCount(0)
      })
    }

    previousOpenRef.current = open
    previousStyleIdRef.current = currentStyleId
  }, [initialColorCode, initialSizeCode, open, style])

  useEffect(() => {
    if (!style) return
    const nextSizeCode = sizeCode && sizeOptions.includes(sizeCode)
      ? sizeCode
      : sizeOptions.length === 1
        ? sizeOptions[0]
        : ""

    if (nextSizeCode !== sizeCode) {
      void Promise.resolve().then(() => setSizeCode(nextSizeCode))
    }
  }, [sizeCode, sizeOptions, style])

  useEffect(() => {
    if (!style) return
    const nextColorCode = colorCode && colorOptions.includes(colorCode)
      ? colorCode
      : colorOptions.length === 1
        ? colorOptions[0]
        : ""

    if (nextColorCode !== colorCode) {
      void Promise.resolve().then(() => setColorCode(nextColorCode))
    }
  }, [colorCode, colorOptions, style])

  function close() {
    onClose()
    onOpenChange(false)
  }

  const sizeSelectOptions: OpsOption[] = sizeOptions.map((value) => ({
    value,
    label: style?.variants.find((v) => v.size_code === value)?.size_name || value,
  }))

  const colorSelectOptions: OpsOption[] = colorOptions.map((value) => ({
    value,
    label: style?.variants.find((v) => v.color_code === value)?.color_name || value,
  }))

  const price =
    effectivePriceMode === "wholesale"
      ? selectedVariant?.wholesale_price ?? selectedVariant?.retail_price
      : selectedVariant?.retail_price ?? selectedVariant?.wholesale_price

  const canConfirm = Boolean(selectedVariant && selectedVariant.stock > 0 && price != null)

  const errorMessage = (() => {
    if (!sizeCode || !colorCode) return null
    if (!selectedVariant) return POS.productConfig.noVariant
    if (Number(selectedVariant.stock || 0) <= 0) return POS.productConfig.noStock
    if (price == null) return POS.productConfig.noPriceMsg
    return null
  })()

  function handleAdd() {
    if (selectedVariant && canConfirm) {
      onConfirm(selectedVariant, quantity)
      setAddedCount((prev) => prev + 1)
      setQuantity(1)
    }
  }

  const sizeLabel = sizeCode
    ? (style?.variants.find((v) => v.size_code === sizeCode)?.size_name || sizeCode)
    : null
  const colorLabel = colorCode
    ? (style?.variants.find((v) => v.color_code === colorCode)?.color_name || colorCode)
    : null
  const needsSizeSelection = allSizeOptions.length > 1 && !sizeCode
  const needsColorSelection = allColorOptions.length > 1 && !colorCode
  const status = (() => {
    if (addedCount > 0) {
      return {
        message: POS.productConfig.added,
        toneClass:
          "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]",
      }
    }
    if (needsSizeSelection && needsColorSelection) {
      return {
        message: POS.productConfig.selectBoth,
        toneClass:
          "border-[var(--ops-border-strong)] bg-[${MUTED_SURFACE_MIX}] text-[var(--ops-text-muted)]",
      }
    }
    if (needsSizeSelection) {
      return {
        message: POS.productConfig.selectSizeOnly,
        toneClass:
          "border-[var(--ops-border-strong)] bg-[${MUTED_SURFACE_MIX}] text-[var(--ops-text-muted)]",
      }
    }
    if (needsColorSelection) {
      return {
        message: POS.productConfig.selectColorOnly,
        toneClass:
          "border-[var(--ops-border-strong)] bg-[${MUTED_SURFACE_MIX}] text-[var(--ops-text-muted)]",
      }
    }
    if (errorMessage) {
      return {
        message: errorMessage,
        toneClass:
          "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]",
      }
    }
    if (canConfirm) {
      return {
        message: POS.productConfig.ready,
        toneClass:
          "border-[var(--ops-border-strong)] bg-[${MUTED_SURFACE_MIX}] text-[var(--ops-text)]",
      }
    }
    return null
  })()

  function handleSizeChange(value: string) {
    setAddedCount(0)
    setSizeCode(value)
  }

  function handleColorChange(value: string) {
    setAddedCount(0)
    setColorCode(value)
  }

  function handleDecrement() {
    setAddedCount(0)
    setQuantity((current) => Math.max(1, current - 1))
  }

  function handleIncrement() {
    setAddedCount(0)
    setQuantity((current) =>
      Math.min(selectedVariant?.stock || 1, current + 1),
    )
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title={style?.style_name || POS.productConfig.title}
      description={POS.productConfig.description}
      size="sm"
      bodyClassName="space-y-2.5"
      footerClassName="pt-1"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={close}
          >
            {addedCount > 0 ? POS.productConfig.done : POS.productConfig.close}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            disabled={!canConfirm}
            onClick={handleAdd}
          >
            {addedCount > 0 ? POS.productConfig.addAnother : POS.productConfig.addButton}
          </Button>
        </div>
      }
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <OpsSelect
          value={sizeCode}
          onValueChange={handleSizeChange}
          placeholder={POS.productConfig.selectSize}
          options={sizeSelectOptions}
        />
        <OpsSelect
          value={colorCode}
          onValueChange={handleColorChange}
          placeholder={POS.productConfig.selectColor}
          options={colorSelectOptions}
        />
      </div>

      <div className={`space-y-1.5 ${INFO_BOX}`}>
        {panelRow(
          POS.productConfig.size,
          sizeLabel ? (
            <span className={PANEL_VALUE}>{sizeLabel}</span>
          ) : (
            <span className={PANEL_PLACEHOLDER}>&middot;&middot;&middot;</span>
          ),
        )}
        {panelRow(
          POS.productConfig.color,
          colorLabel ? (
            <span className={PANEL_VALUE}>{colorLabel}</span>
          ) : (
            <span className={PANEL_PLACEHOLDER}>&middot;&middot;&middot;</span>
          ),
        )}
        {panelRow(
          POS.productConfig.stock,
          selectedVariant ? (
            selectedVariant.stock > 0 ? (
              <span className={PANEL_VALUE}>{selectedVariant.stock}</span>
            ) : (
              <span className="text-sm font-medium text-[var(--ops-tone-danger-text)]">
                {POS.productConfig.outOfStock}
              </span>
            )
          ) : (
            <span className={PANEL_PLACEHOLDER}>{POS.productConfig.pending}</span>
          ),
        )}
        {panelRow(
          POS.productConfig.price,
          price != null ? (
            <span className={PANEL_VALUE}>{POS.summary.moneyPrefix} {formatMoney(price)}</span>
          ) : selectedVariant ? (
            <span className="text-sm font-medium text-[var(--ops-tone-danger-text)]">
              {POS.productConfig.noPrice}
            </span>
          ) : (
            <span className={PANEL_PLACEHOLDER}>{POS.productConfig.pending}</span>
          ),
        )}
      </div>

      {selectedVariant && selectedVariant.stock > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border-strong)] bg-[${MUTED_SURFACE_MIX}] px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Cantidad
          </span>
          <OpsQuantityStepper
            layout="horizontal"
            size="sm"
            value={quantity}
            min={1}
            max={selectedVariant.stock || 1}
            onDecrement={handleDecrement}
            onIncrement={handleIncrement}
          />
        </div>
      ) : null}

      {status ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${status.toneClass}`}
          aria-live="polite"
        >
          {status.message}
        </p>
      ) : null}
    </OpsDialog>
  )
}
