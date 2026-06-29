"use client"

import { OpsFormField } from "@/components/ui/ops-form-field"
import {
  OpsColorSwatch,
  OpsMultiSelectMenu,
  OpsSelect,
  OpsSelectionChip,
  OpsToggleChip,
} from "@/components/ui/ops-selection"
import {
  INFO_BOX_MUTED,
  opsInputCompact,
} from "@/components/ui/ops-control-styles"
import { cn } from "@/lib/utils"
import { PRODUCTS } from "./products-messages"
import type {
  ProductCreateCatalogItem,
  ProductCreateFieldName,
  ProductCreateFormErrors,
  ProductCreateFormState,
} from "./products-types"
import {
  calculateProjectedVariants,
  deriveProductCreateReadiness,
  getProductCatalogItemId,
  normalizeProductNameInput,
  PRODUCT_CREATE_FIELD_IDS,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  toggleProductCreateSelection,
} from "./products-utils"

type ProductCreateFormProps = {
  state: ProductCreateFormState
  errors: ProductCreateFormErrors | null
  garmentTypes: ProductCreateCatalogItem[]
  sizes: ProductCreateCatalogItem[]
  colors: ProductCreateCatalogItem[]
  disabled?: boolean
  onChange: (next: ProductCreateFormState, field: ProductCreateFieldName) => void
}

function getItemLabel(item: ProductCreateCatalogItem) {
  return String(item.name || item.code || "")
}

function getSizeDisplayLabel(size: ProductCreateCatalogItem) {
  return String(size.code || size.name || "")
}

function getColorDisplayLabel(color: ProductCreateCatalogItem) {
  return String(color.name || color.code || PRODUCTS.form.colorFallback)
}

function isUniqueColor(color: ProductCreateCatalogItem) {
  return String(color.code || "").trim().toUpperCase() === "UNICO"
}

function sortCatalogItems(items: ProductCreateCatalogItem[]) {
  return [...items].sort((left, right) => {
    const leftOrder = Number(left.sort_order ?? 0)
    const rightOrder = Number(right.sort_order ?? 0)

    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return getItemLabel(left).localeCompare(getItemLabel(right), "es")
  })
}

function ProductSizeChipPicker({
  sizes,
  selectedIds,
  disabled,
  onToggle,
}: {
  sizes: ProductCreateCatalogItem[]
  selectedIds: string[]
  disabled?: boolean
  onToggle: (sizeId: string) => void
}) {
  if (!sizes.length) {
    return (
      <p className="text-sm text-[var(--ops-text-muted)]">
        {PRODUCTS.form.noSizes}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const sizeId = getProductCatalogItemId(size, ["size_id"])
        const selected = selectedIds.includes(sizeId)

        return (
          <OpsToggleChip
            key={sizeId}
            label={getSizeDisplayLabel(size)}
            selected={selected}
            disabled={disabled}
            onToggle={() => onToggle(sizeId)}
          />
        )
      })}
    </div>
  )
}

function ProductColorMultiSelect({
  colors,
  useUniqueColor,
  selectedIds,
  error,
  disabled,
  onUseUniqueColorChange,
  onToggle,
}: {
  colors: ProductCreateCatalogItem[]
  useUniqueColor: boolean
  selectedIds: string[]
  error?: string | null
  disabled?: boolean
  onUseUniqueColorChange: (useUniqueColor: boolean) => void
  onToggle: (colorId: string) => void
}) {
  const manualColors = colors.filter((color) => !isUniqueColor(color))
  const selectedColors = manualColors.filter((color) =>
    selectedIds.includes(getProductCatalogItemId(color, ["color_id"])),
  )
  const availableColors = manualColors.filter(
    (color) => !selectedIds.includes(getProductCatalogItemId(color, ["color_id"])),
  )
  const uniqueColorDisabled = disabled
  const colorSelectorDisabled = disabled || useUniqueColor || availableColors.length === 0
  const colorSelectorPlaceholder =
    !availableColors.length && !useUniqueColor
      ? PRODUCTS.form.allColorsSelected
      : PRODUCTS.form.colorsPlaceholder
  const uniqueColorToggle = (
    <label
      className={cn(
        "flex h-9 shrink-0 select-none items-center gap-2 rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-3 text-[0.8125rem] font-medium text-[var(--ops-text-muted)] transition",
        uniqueColorDisabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:bg-[var(--ops-surface)] hover:text-[var(--ops-text)]",
      )}
    >
      <input
        type="checkbox"
        checked={useUniqueColor}
        disabled={uniqueColorDisabled}
        onChange={(event) => onUseUniqueColorChange(event.target.checked)}
        className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)] disabled:cursor-not-allowed"
      />
      <span className="leading-none">{PRODUCTS.form.uniqueColor}</span>
    </label>
  )

  if (!manualColors.length) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <OpsMultiSelectMenu
            selectedValues={[]}
            onToggle={() => undefined}
            placeholder={PRODUCTS.form.noColors}
            disabled
            options={[]}
          />
          {uniqueColorToggle}
        </div>
        {error ? (
          <p role="alert" className="text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <OpsMultiSelectMenu
          selectedValues={availableColors.length ? selectedIds : []}
          onToggle={onToggle}
          placeholder={colorSelectorPlaceholder}
          disabled={colorSelectorDisabled}
          options={availableColors.map((color) => {
            const colorId = getProductCatalogItemId(color, ["color_id"])
            const label = getColorDisplayLabel(color)

            return {
              value: colorId,
              label,
              leading: <OpsColorSwatch hex={color.hex} />,
            }
          })}
          formatCountLabel={PRODUCTS.form.colorsCountLabel}
        />
        {uniqueColorToggle}
      </div>
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
          {error}
        </p>
      ) : null}
      {!useUniqueColor && selectedColors.length ? (
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {selectedColors.map((color) => {
            const colorId = getProductCatalogItemId(color, ["color_id"])
            const label = getColorDisplayLabel(color)

            return (
              <OpsSelectionChip
                key={colorId}
                label={label}
                leading={<OpsColorSwatch hex={color.hex} />}
                disabled={disabled}
                removeMode="chip"
                title={PRODUCTS.form.removeColor(label)}
                onRemove={() => onToggle(colorId)}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">{value}</p>
    </div>
  )
}

function ProductCreateSectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
      {label}
    </p>
  )
}

export function ProductCreateForm({
  state,
  errors,
  garmentTypes,
  sizes,
  colors,
  disabled = false,
  onChange,
}: ProductCreateFormProps) {
  function patch(field: ProductCreateFieldName, next: Partial<ProductCreateFormState>) {
    onChange({ ...state, ...next }, field)
  }

  const activeSizes = sortCatalogItems(sizes.filter((size) => size.active !== false))
  const activeColors = sortCatalogItems(colors.filter((color) => color.active !== false))
  const descriptionLength = state.description.length
  const projectedVariants = calculateProjectedVariants(
    state.size_ids.length,
    state.use_unique_color ? 0 : state.color_ids.length,
  )
  const readiness = deriveProductCreateReadiness(state)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <ProductCreateSectionHeader label={PRODUCTS.form.sections.product} />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.85fr)]">
          <OpsFormField
            id={PRODUCT_CREATE_FIELD_IDS.name}
            label={PRODUCTS.form.name}
            required
            error={errors?.name}
            density="compact"
          >
            <input
              type="text"
              value={state.name}
              disabled={disabled}
              onChange={(event) => patch("name", { name: event.target.value })}
              onBlur={() => {
                const normalizedName = normalizeProductNameInput(state.name)
                if (normalizedName !== state.name) {
                  patch("name", { name: normalizedName })
                }
              }}
              placeholder={PRODUCTS.form.namePlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField
            id={PRODUCT_CREATE_FIELD_IDS.garment_type_id}
            label={PRODUCTS.form.garmentType}
            required
            error={errors?.garment_type_id}
            density="compact"
          >
            <div id={PRODUCT_CREATE_FIELD_IDS.garment_type_id} tabIndex={-1}>
              <OpsSelect
                value={state.garment_type_id}
                onValueChange={(value) => patch("garment_type_id", { garment_type_id: value })}
                disabled={disabled}
                placeholder={PRODUCTS.form.garmentTypePlaceholder}
                options={garmentTypes
                  .filter((item) => item.active !== false)
                  .map((item) => ({
                    value: getProductCatalogItemId(item, ["garment_type_id"]),
                    label: String(item.name || item.code || ""),
                  }))}
                className="h-9"
                error={errors?.garment_type_id}
              />
            </div>
          </OpsFormField>
        </div>

        <OpsFormField
          id={PRODUCT_CREATE_FIELD_IDS.description}
          label={PRODUCTS.form.description}
          optionalLabel
          error={errors?.description}
          density="compact"
        >
          <div className="relative">
            <textarea
              value={state.description}
              disabled={disabled}
              onChange={(event) => patch("description", { description: event.target.value })}
              rows={1}
              maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
              placeholder={PRODUCTS.form.descriptionPlaceholder}
              className={`${opsInputCompact} min-h-9 resize-y pb-5 pr-14 pt-2`}
            />
            <span className="pointer-events-none absolute bottom-1.5 right-3 text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
              {PRODUCTS.form.descriptionCounter(
                descriptionLength,
                PRODUCT_DESCRIPTION_MAX_LENGTH,
              )}
            </span>
          </div>
        </OpsFormField>
      </div>

      <div className="space-y-3">
        <ProductCreateSectionHeader label={PRODUCTS.form.sections.variants} />
        <OpsFormField
          id={PRODUCT_CREATE_FIELD_IDS.size_ids}
          label={PRODUCTS.form.sizes}
          required
          error={errors?.size_ids}
          density="compact"
        >
          <div id={PRODUCT_CREATE_FIELD_IDS.size_ids} tabIndex={-1}>
            <ProductSizeChipPicker
              sizes={activeSizes}
              selectedIds={state.size_ids}
              disabled={disabled}
              onToggle={(sizeId) =>
                patch("size_ids", {
                  size_ids: toggleProductCreateSelection(state.size_ids, sizeId),
                })
              }
            />
          </div>
        </OpsFormField>

        <OpsFormField
          id={PRODUCT_CREATE_FIELD_IDS.color_ids}
          label={PRODUCTS.form.colors}
          required
          error={errors?.color_ids}
          hideErrorMessage
          density="compact"
        >
          <div id={PRODUCT_CREATE_FIELD_IDS.color_ids} tabIndex={-1}>
            <ProductColorMultiSelect
              colors={activeColors}
              useUniqueColor={state.use_unique_color}
              selectedIds={state.color_ids}
              error={errors?.color_ids}
              disabled={disabled}
              onUseUniqueColorChange={(useUniqueColor) =>
                patch("color_ids", {
                  use_unique_color: useUniqueColor,
                  color_ids: useUniqueColor ? [] : state.color_ids,
                })
              }
              onToggle={(colorId) =>
                patch("color_ids", {
                  color_ids: toggleProductCreateSelection(state.color_ids, colorId),
                })
              }
            />
          </div>
        </OpsFormField>
      </div>

      <div className={`${INFO_BOX_MUTED} space-y-2`}>
        <div className="grid grid-cols-3 gap-3">
          <SummaryItem label={PRODUCTS.form.summarySizes} value={state.size_ids.length} />
          <SummaryItem
            label={PRODUCTS.form.summaryColors}
            value={
              state.use_unique_color
                ? PRODUCTS.form.uniqueColorChip
                : state.color_ids.length
            }
          />
          <SummaryItem label={PRODUCTS.form.summaryVariants} value={projectedVariants} />
        </div>
        <p
          className={cn(
            "border-t border-[var(--ops-border-soft)] pt-2 text-xs font-medium",
            readiness.ready
              ? "text-[var(--ripnel-accent-hover)]"
              : "text-[var(--ops-text-muted)]",
          )}
        >
          {readiness.statusLabel}
        </p>
      </div>
    </div>
  )
}
