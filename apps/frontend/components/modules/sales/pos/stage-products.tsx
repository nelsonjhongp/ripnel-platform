"use client"

import { PencilLine, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading"
import { OpsHint } from "@/components/ui/ops-hint"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/format-utils"
import { ProductStylePicker } from "@/components/modules/sales/search/product-style-picker"

import { StageSection } from "./stage-section"
import { POS } from "./pos-messages"
import { ACCENT_HOVER_BORDER } from "./pos-constants"
import type { ProductStageProps } from "./pos-stage-props"

// NOTE: OpsDataTable is intentionally not used here.
// The cart table requires sticky headers, max-height scroll container with auto-scroll,
// interactive row content (OpsQuantityStepper, action buttons), and compact row padding
// (--ops-row-py). OpsDataTable only renders static data tables without these features.
const TH_CLASS = "border-b border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-[var(--ops-row-py)]"
const TD_CLASS = "px-4 py-[var(--ops-row-py)] align-middle"

export function ProductStage(props: ProductStageProps) {
  const {
    pulseStage,
    query,
    setQuery,
    searchableStyles,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectProductStyle,
    cart,
    totals,
    updateQty,
    openPriceSheet,
    removeFromCart,
    defaultLocation,
    productSearchInputRef,
    productSectionRef,
    pricingModeOverride,
    setPricingModeOverride,
  } = props

  const productInputValue = query
  const productInputPlaceholder = POS.product.searchPlaceholder

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const prevCartLengthRef = useRef(cart.length)

  useEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      const container = tableScrollRef.current
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      }
    }
    prevCartLengthRef.current = cart.length
  }, [cart.length])

  return (
    <StageSection
      sectionRef={productSectionRef}
      stage="products"
      pulseStage={pulseStage}
      pickerOpen={productPickerOpen}
    >
      <OpsStepSectionHeading
        step={1}
        title={POS.stage.products}
        meta={(() => {
          const effectiveMode = totals.priceMode
          const isManual = pricingModeOverride !== "auto"
          const modeLabel = effectiveMode === "retail" ? POS.product.priceModeRetail : POS.product.priceModeWholesale
          const buttonLabel = isManual ? `${modeLabel} (${POS.product.priceModeManual})` : modeLabel
          const indicatorColorClass = isManual
            ? "text-amber-500"
            : "text-[var(--ripnel-accent)]"
          const indicatorMaskPath =
            effectiveMode === "retail" ? "url('/block.svg')" : "url('/blocks-group.svg')"

          return (
            <button
              type="button"
              onClick={() => {
                if (pricingModeOverride === "auto") setPricingModeOverride("wholesale")
                else if (pricingModeOverride === "wholesale") setPricingModeOverride("retail")
                else setPricingModeOverride("auto")
              }}
              className={`relative inline-flex h-7 min-w-[126px] max-w-[168px] items-center justify-center rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 pr-3.5 pl-8 text-[12px] font-medium text-[var(--ops-text)] transition hover:border-${ACCENT_HOVER_BORDER} hover:bg-[var(--ops-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]`}
              aria-label={
                pricingModeOverride === "auto"
                  ? POS.priceModeToggle.activateManualWholesale
                  : pricingModeOverride === "wholesale"
                    ? POS.priceModeToggle.switchToManualRetail
                    : POS.priceModeToggle.returnToAuto
              }
              title={
                isManual
                  ? POS.priceModeToggle.manualTooltip(modeLabel)
                  : POS.priceModeToggle.autoTooltip(modeLabel)
              }
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center ${indicatorColorClass}`}
              >
                <span
                  className="block h-4 w-4 bg-current"
                  style={{
                    WebkitMaskImage: indicatorMaskPath,
                    maskImage: indicatorMaskPath,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
              </span>
              <span className="block min-w-0 truncate text-center leading-none">
                {buttonLabel}
              </span>
            </button>
          )
        })()}
      />

      <ProductStylePicker
        value={productInputValue}
        onChange={(value) => {
          setQuery(value)
        }}
        placeholder={productInputPlaceholder}
        disabled={!defaultLocation}
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        items={searchableStyles}
        loading={loadingVariants}
        loadingMessage={POS.product.loadingMessage}
        emptyMessage={
          !defaultLocation
            ? POS.product.noLocationMessage
            : POS.product.noMatchMessage
        }
        maxVisibleItems={6}
        highlightedIndex={highlightedProductIndex}
        onHighlightChange={setHighlightedProductIndex}
        onSelect={(style) => {
          selectProductStyle(style)
        }}
        onClear={() => {
          setQuery("")
          selectProductStyle(null)
          setHighlightedProductIndex(0)
          window.requestAnimationFrame(() => {
            productSearchInputRef.current?.focus()
          })
        }}
        inputRef={productSearchInputRef}
        name="sale_product_search"
        showClear={Boolean(query && defaultLocation)}
      />

      <div
        className={`-mx-4 overflow-hidden rounded-b-xl sm:-mx-5 ${
          cart.length === 0 ? "" : "-mb-4 sm:-mb-5"
        }`}
      >
        {cart.length === 0 ? (
          <OpsHint className="mx-4 sm:mx-5 py-3">{POS.product.emptyCart}</OpsHint>
        ) : (
          <div ref={tableScrollRef} className="max-h-[220px] overflow-auto ops-minimal-scrollbar">
            <div className="min-w-[760px] border-b border-[var(--ops-border-strong)]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className={TH_CLASS}>{POS.table.columns.product}</th>
                    <th className={TH_CLASS}>{POS.table.columns.variant}</th>
                    <th className={cn(TH_CLASS, "text-center")}>{POS.table.columns.quantity}</th>
                    <th className={cn(TH_CLASS, "text-right")}>{POS.table.columns.unitPrice}</th>
                    <th className={cn(TH_CLASS, "text-right")}>{POS.table.columns.subtotal}</th>
                    <th className={cn(TH_CLASS, "text-right")} aria-label={POS.table.columns.actions} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {totals.items.map((item) => (
                    <tr
                      key={item.variant_id}
                      className="transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <td className={TD_CLASS}>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">{item.style_name}</p>
                        {item.price_override?.reason ? (
                          <p className="mt-1 text-[11px] text-[var(--ripnel-accent-hover)]">
                            {POS.product.priceAdjustLabel}: {item.price_override.reason}
                          </p>
                        ) : null}
                      </td>
                      <td className={cn(TD_CLASS, "text-sm text-[var(--ops-text)]")}>
                        <span>{item.size_name || item.size_code}</span>
                        {(item.size_name || item.color_name) && (item.color_name || item.color_code) ? (
                          <span className="text-[var(--ops-text-muted)]"> / </span>
                        ) : null}
                        <span>{item.color_name || item.color_code}</span>
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex justify-center">
                          <OpsQuantityStepper
                            layout="horizontal"
                            size="sm"
                            value={item.quantity}
                            onDecrement={() => updateQty(item.variant_id, -1)}
                            onIncrement={() => updateQty(item.variant_id, 1)}
                            min={1}
                            max={item.stock}
                          />
                        </div>
                      </td>
                      <td className={cn(TD_CLASS, "text-right")}>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            S/. {formatMoney(item.unit_price_before_discount)}
                          </p>
                          <span className="text-[11px] font-medium text-[var(--ops-text-muted)]">
                            {item.price_type_applied === "wholesale" ? POS.product.priceTypeWholesale : POS.product.priceTypeRetail}
                          </span>
                        </div>
                      </td>
                      <td className={cn(TD_CLASS, "text-right")}>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          S/. {formatMoney(item.line_subtotal_before_discount)}
                        </p>
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openPriceSheet(item)}
                            className="rounded-lg text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] focus-visible:ring-[var(--ripnel-accent-soft)]"
                            aria-label={POS.product.editPriceAria}
                            title={POS.product.editPriceAria}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeFromCart(item.variant_id)}
                            className="rounded-lg text-[var(--ops-tone-danger-text)] hover:bg-[var(--ops-tone-danger-bg)] hover:text-[var(--ops-tone-danger-text)] focus-visible:border-[var(--ops-tone-danger-border)] focus-visible:ring-[var(--ops-tone-danger-bg)]"
                            aria-label={POS.product.removeProductAria}
                            title={POS.product.removeProductTitle}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StageSection>
  )
}
