"use client"

import { CircleAlert, Minus, PencilLine, Plus, ShoppingBasket, Trash2 } from "lucide-react"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { Button } from "@/components/ui/button"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { OpsHint } from "@/components/ui/ops-hint"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/format-utils"

import { StageSection } from "./stage-section"
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
  const productInputPlaceholder = "Buscar por producto, SKU o escanear código"

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
        title="Productos"
        meta={(() => {
          const effectiveMode = totals.priceMode
          const isManual = pricingModeOverride !== "auto"
          const modeLabel = effectiveMode === "retail" ? "Minorista" : "Mayorista"
          const buttonLabel = isManual ? `${modeLabel} (Manual)` : modeLabel
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
              className="relative inline-flex h-7 min-w-[126px] max-w-[168px] items-center justify-center rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 pr-3.5 pl-8 text-[12px] font-medium text-[var(--ops-text)] transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] hover:bg-[var(--ops-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]"
              aria-label={
                pricingModeOverride === "auto"
                  ? "Activar modo manual mayorista"
                  : pricingModeOverride === "wholesale"
                    ? "Cambiar a modo manual minorista"
                    : "Volver a modo automático"
              }
              title={
                isManual
                  ? `Modo manual: ${modeLabel} — clic para volver a automático`
                  : `Automático: ${modeLabel} — clic para activar mayorista manual`
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

      <SearchablePicker
        value={productInputValue}
        onChange={(value) => {
          setQuery(value)
        }}
        placeholder={productInputPlaceholder}
        disabled={!defaultLocation}
        openOnFocus
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        items={searchableStyles}
        loading={loadingVariants}
        loadingMessage="Buscando productos…"
        emptyMessage={
          !defaultLocation
            ? "Configura tu sede primero para ver productos."
            : "No encontramos coincidencias para esta búsqueda."
        }
        maxVisibleItems={6}
        highlightedIndex={highlightedProductIndex}
        onHighlightChange={setHighlightedProductIndex}
        getItemKey={(style) => style.style_id}
        renderItem={(style) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex gap-3">
              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                {style.style_name}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                {style.variants.length} variante{style.variants.length === 1 ? "" : "s"}
              </p>
            </div>
            <OpsStatusBadge
              tone={style.totalStock > 0 ? "success" : "danger"}
              size="xs"
              className="shrink-0"
            >
              {style.totalStock > 0 ? `Stock ${style.totalStock}` : "Sin stock"}
            </OpsStatusBadge>
          </div>
        )}
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
        autoComplete="off"
        inputMode="search"
        enterKeyHint="search"
        showClear={Boolean(query && defaultLocation)}
        density="compact"
      />

      <div
        className={`-mx-4 overflow-hidden rounded-b-xl sm:-mx-5 ${
          cart.length === 0 ? "" : "-mb-4 sm:-mb-5"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBasket className="h-5 w-5 text-[var(--ripnel-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
              Productos
            </h2>
          </div>

        </div>

        <SearchablePicker
          value={productInputValue}
          onChange={(value) => {
            setQuery(value);
          }}
          placeholder={productInputPlaceholder}
          disabled={!defaultLocation}
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          items={searchableStyles}
          loading={loadingVariants}
          loadingMessage="Buscando productos..."
          emptyMessage={
            !defaultLocation
              ? "Configura tu sede primero para ver productos."
              : "No encontramos coincidencias para esta búsqueda."
          }
          maxVisibleItems={8}
          highlightedIndex={highlightedProductIndex}
          onHighlightChange={setHighlightedProductIndex}
          getItemKey={(style) => style.style_id}
          renderItem={(style) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex gap-3">
                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                  {style.style_name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                  {style.variants.length} variante
                  {style.variants.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>
              <span
                className={`${style.totalStock > 0 ? "sales-chip sales-chip-success" : "sales-chip sales-chip-danger"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}
              >
                stock: {style.totalStock}
              </span>
            </div>
          )}
          onSelect={(style) => {
            selectProductStyle(style);
          }}
          onClear={() => {
            setQuery("");
            selectProductStyle(null);
            setSelectedSizeCode("");
            setSelectedColorCode("");
            setHighlightedProductIndex(0);
            window.requestAnimationFrame(() => {
              productSearchInputRef.current?.focus();
            });
          }}
          inputRef={productSearchInputRef}
          selectedItemKey={selectedProductStyle?.style_id}
          showClear={Boolean((selectedProductStyle || query) && defaultLocation)}
        />

        <div className="border-y border-[var(--ops-border-strong)] py-3">
          {!selectedProductStyle ? (
            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-6 text-sm text-[var(--ops-text-muted)]">
              Selecciona un producto para configurar talla,
              color y agregarlo a la venta.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[178px_180px_minmax(0,1fr)_116px] lg:items-end">
              <div>
                <label className={COMPACT_LABEL_CLASS}>
                  Talla
                </label>
                <OpsSelectMenu
                  value={selectedSizeCode}
                  onValueChange={setSelectedSizeCode}
                  placeholder={
                    sizeSelectOptions.length
                      ? "Seleccionar talla"
                      : "Sin tallas"
                  }
                  options={sizeSelectOptions}
                />
              </div>

              <div>
                <label className={COMPACT_LABEL_CLASS}>
                  Color
                </label>
                <OpsSelectMenu
                  value={selectedColorCode}
                  onValueChange={setSelectedColorCode}
                  placeholder={
                    colorSelectOptions.length
                      ? "Seleccionar color"
                      : "Sin colores"
                  }
                  options={colorSelectOptions}
                />
              </div>

              <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-3 py-2.5">
                {!selectedVariant ? (
                  <p className="text-sm text-[var(--ops-text-muted)]">
                    Completa talla y color.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <OpsStatusBadge
                      tone={buildVariantTone(
                        previewWholesaleApplies &&
                          selectedVariant.wholesale_price !==
                            null &&
                          selectedVariant.wholesale_price !==
                            undefined,
                      )}
                      className="px-2 py-0.5"
                    >
                      {previewWholesaleApplies &&
                      selectedVariant.wholesale_price !==
                        null &&
                      selectedVariant.wholesale_price !==
                        undefined
                        ? "Mayorista activo"
                        : "Retail vigente"}
                    </OpsStatusBadge>
                    <span className="font-medium text-[var(--ops-text)]">
                      {selectedVariantAutoPrice !== null &&
                      selectedVariantAutoPrice !== undefined
                        ? `S/. ${formatMoney(selectedVariantAutoPrice)}`
                        : "Sin precio"}
                    </span>
                    <span
                      className={`${Number(selectedVariant.stock || 0) > 0 ? "sales-chip sales-chip-success" : "sales-chip sales-chip-danger"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}
                    >
                      Stock {Number(selectedVariant.stock || 0)}
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="accent"
                size="lg"
                onClick={() =>
                  selectedVariant && addToCart(selectedVariant)
                }
                disabled={
                  !selectedVariant ||
                  (selectedVariant.retail_price === null &&
                    selectedVariant.wholesale_price === null) ||
                  (selectedVariant.retail_price === undefined &&
                    selectedVariant.wholesale_price ===
                      undefined) ||
                  Number(selectedVariant.stock || 0) <= 0
                }
                className="h-10 w-full rounded-lg px-4 shadow-sm"
              >
                {!selectedVariant
                  ? "Agregar"
                  : Number(selectedVariant.stock || 0) <= 0
                    ? "Sin stock"
                    : (selectedVariant.retail_price === null &&
                          selectedVariant.wholesale_price ===
                            null) ||
                        (selectedVariant.retail_price ===
                          undefined &&
                          selectedVariant.wholesale_price ===
                            undefined)
                      ? "Sin precio"
                      : "Agregar"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section
        className={`relative z-0 space-y-3 xl:order-3 xl:col-span-2 ${
          active ? "" : "hidden"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBasket className="h-5 w-5 text-[var(--ripnel-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
              Detalle de venta
            </h2>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  totals.wholesaleApplied
                    ? buildSemanticChipClass("success")
                    : buildSemanticChipClass("neutral")
                }`}
              >
                {totals.wholesaleApplied
                  ? "Mayorista activo"
                  : "Retail vigente"}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {totals.wholesaleApplied
                ? `Aplica desde ${posContext?.pricing?.wholesale_min_qty_total || 3} unidades en la venta.`
                : "Se aplica el precio vigente de lista hasta alcanzar el umbral mayorista."}
            </TooltipContent>
          </Tooltip>
        </div>

        <OpsDataTable
          columns={[
            { key: "producto", header: "Producto" },
            { key: "talla", header: "Talla" },
            { key: "color", header: "Color" },
            { key: "cantidad", header: "Cantidad", className: "text-center" },
            { key: "precio", header: "Precio aplicado", className: "text-right" },
            { key: "subtotal", header: "Subtotal", className: "text-right" },
            { key: "acciones", header: "Acciones", className: "text-right" },
          ]}
          minWidth="980px"
          isEmpty={cart.length === 0}
          emptyMessage="Aun no hay productos agregados a la venta."
        >
          {totals.items.map((item) => (
            <tr
              key={item.variant_id}
              className="transition hover:bg-[var(--ops-surface-muted)]"
            >
              <td className="px-4 py-[var(--ops-row-py)] align-top">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {item.style_name}
                </p>
                {item.price_override?.reason ? (
                  <p className="mt-1 text-[11px] text-[var(--ripnel-accent-hover)]">
                    Ajuste manual:{" "}
                    {item.price_override.reason}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                {item.size_name || item.size_code}
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                {item.color_name || item.color_code}
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top">
                <div className="flex justify-center">
                  <div className="sales-field flex items-center gap-1 rounded-lg px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(item.variant_id, -1)
                      }
                      className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text-muted)]"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-[var(--ops-text)]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(item.variant_id, 1)
                      }
                      disabled={
                        item.quantity >= item.stock
                      }
                      className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text-muted)] disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    S/.{" "}
                    {formatMoney(
                      item.unit_price_before_discount,
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--ops-text-muted)]">
                    {item.price_type_applied ===
                    "wholesale"
                      ? "Mayorista"
                      : "Retail"}
                  </p>
                </div>
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  S/.{" "}
                  {formatMoney(
                    item.line_subtotal_before_discount,
                  )}
                </p>
              </td>
              <td className="px-4 py-[var(--ops-row-py)] align-top">
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          openPriceSheet(item)
                        }
                        className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1.5 text-[var(--ops-text-muted)] transition"
                        aria-label={
                          item.price_override
                            ? "Editar precio"
                            : "Ajustar precio"
                        }
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={8}
                    >
                      {item.price_override
                        ? "Editar precio"
                        : "Ajustar precio"}
                    </TooltipContent>
                  </Tooltip>
                  {item.price_override ? (
                    <button
                      type="button"
                      onClick={() =>
                        clearPriceAdjustment(
                          item.variant_id,
                        )
                      }
                      className="rounded-lg p-1 text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface)] hover:text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
                      aria-label="Quitar ajuste"
                    >
                      <CircleAlert className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      removeFromCart(item.variant_id)
                    }
                    className={`rounded-lg border p-1.5 transition hover:bg-[var(--ops-surface-muted)] ${buildSemanticChipClass("danger")}`}
                    aria-label="Quitar producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </OpsDataTable>
      </section>
    </div>
  )
}
