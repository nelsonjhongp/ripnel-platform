"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Eraser,
  FileText,
  LoaderCircle,
  ListRestart,
  PencilLine,
  Plus,
  Store,
  Trash2,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminTextarea } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import { OpsSelectMenu, type OpsOption } from "@/components/ui/ops-selection";
import { OpsTableWrap } from "@/components/ui/ops-page-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DraftLine,
  RequestCandidate,
  RequestCandidateSource,
  RequestLocationOption,
  RequestProductGroup,
  RequestProductVariant,
} from "./transfers-shared"
import { OpsLocationIcon } from "@/components/ui/ops-location-icon"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"

const panelClass = "ops-surface rounded-xl border";
const softPanelClass =
  "ops-surface-muted rounded-xl border border-[var(--ops-border-soft)]";
const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]";

function clampQuantity(value: number, min = 1, max?: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  const normalized = Math.max(min, Math.trunc(value));

  if (typeof max === "number") {
    return Math.min(normalized, max);
  }

  return normalized;
}

function getVariantOriginStock(variant: RequestProductVariant, lockedOriginId: string) {
  return (
    variant.candidate_sources.find((source) => source.location_id === lockedOriginId)
      ?.qty_available || 0
  );
}

function FieldLabel({ children }: { children: string }) {
  return <p className={fieldLabelClass}>{children}</p>;
}

function ValidationItem({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        ok
          ? "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]"
          : "text-[color:color-mix(in_srgb,#c96c1d_88%,var(--ops-text))]"
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <CircleAlert className="h-3.5 w-3.5 shrink-0" />}
      <span>{label}</span>
    </div>
  );
}

export function RequestRouteField({
  originOptions,
  originValue,
  onOriginChange,
  destinationName,
  destinationType,
  hasDraftLines,
  disabled = false,
}: {
  originOptions: RequestLocationOption[];
  originValue: string;
  onOriginChange: (value: string) => void;
  destinationName: string;
  destinationType?: string | null;
  hasDraftLines: boolean;
  disabled?: boolean;
}) {
  const selectedOrigin =
    originOptions.find((option) => option.value === originValue) || null;
  const selectedOriginLabel = selectedOrigin?.label || "Seleccionar origen";
  return (
    <section
      className={cn(
        panelClass,
        "space-y-2.5 bg-[color:color-mix(in_srgb,var(--ops-surface)_96%,var(--ops-surface-muted))] p-4 sm:p-5"
      )}
    >
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] md:items-end">
        <div className="min-w-0 space-y-2">
          <FieldLabel>Origen</FieldLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="sales-field sales-field-interactive flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border-[color:color-mix(in_srgb,var(--ops-border-strong)_88%,var(--ripnel-accent)_12%)] bg-[color:color-mix(in_srgb,var(--ops-surface)_98%,var(--ops-surface-muted))] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <OpsLocationIcon
                    type={selectedOrigin?.type}
                    className="h-4 w-4 shrink-0 text-[var(--ops-text)]"
                  />
                  <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                    {selectedOriginLabel}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1"
            >
              <DropdownMenuRadioGroup value={originValue} onValueChange={onOriginChange}>
                {originOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--ops-text)] focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden items-center justify-center pb-3 md:flex">
          <ArrowRight className="h-4 w-4 text-[var(--ops-text)]" />
        </div>

        <div className="min-w-0 space-y-2">
          <FieldLabel>Destino</FieldLabel>
          <div className="sales-field flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border-[color:color-mix(in_srgb,var(--ops-border-strong)_88%,#86d6a8_18%)] bg-[color:color-mix(in_srgb,var(--ops-surface)_98%,var(--ops-surface-muted))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex min-w-0 items-center gap-3">
              <OpsLocationIcon
                type={destinationType}
                className="h-4 w-4 shrink-0 text-[var(--ops-text)]"
              />
              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                {destinationName}
              </p>
              <span className="inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,#86d6a8_58%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#dff8e7_92%,var(--ops-surface))] px-2.5 py-0.5 text-[11px] font-medium text-[color:color-mix(in_srgb,#4a9b67_82%,var(--ops-text))]">
                Actual
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center md:hidden">
        <ArrowRight className="h-4 w-4 text-[var(--ops-text)]" />
      </div>

      {hasDraftLines ? (
        <p className="text-[11px] text-[var(--ops-text-muted)]">
          Si cambias el origen, se eliminarán las líneas agregadas.
        </p>
      ) : null}
    </section>
  );
}

export function RequestProductComposer({
  product,
  lockedOriginId,
  onAdd,
  duplicateDraftVariant,
}: {
  product: RequestProductGroup | null;
  lockedOriginId: string;
  onAdd: (variant: RequestProductVariant, source: RequestCandidateSource, quantity: number) => void;
  duplicateDraftVariant?: {
    variantId: string;
    message: string;
  } | null;
}) {
  const colors = useMemo(
    () =>
      product
        ? [...new Set(product.variants.map((variant) => variant.color_name))]
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
        : [],
    [product]
  );
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState("1");

  const colorOptions = useMemo(
    () =>
      colors.map((color) => {
        const qty = product
          ? product.variants
              .filter((variant) => variant.color_name === color)
              .reduce(
                (accumulator, variant) =>
                  accumulator + getVariantOriginStock(variant, lockedOriginId),
                0
              )
          : 0;

        return {
          value: color,
          label: color,
          helper: `${qty} u.`,
          trailing: (
            <span className="text-[11px] font-semibold text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]">
              {qty} u.
            </span>
          ),
          layout: "between",
          disabled: !lockedOriginId || qty <= 0,
        } satisfies OpsOption;
      }),
    [colors, lockedOriginId, product]
  );

  const selectableColors = colorOptions.filter((option) => !option.disabled);
  const resolvedColor =
    colorOptions.find((option) => option.value === selectedColor && !option.disabled)?.value ||
    (colors.length === 1
      ? colors[0] || ""
      : selectableColors.length === 1
        ? selectableColors[0]?.value || ""
        : "");

  const sizeOptions = useMemo(
    () =>
      product && resolvedColor
        ? [...new Set(product.variants.map((variant) => variant.size_code))]
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
            .map((size) => {
              const variant =
                product.variants.find(
                  (item) => item.color_name === resolvedColor && item.size_code === size
                ) || null;
              const qty = variant ? getVariantOriginStock(variant, lockedOriginId) : 0;

              return {
                value: size,
                label: `${size} - ${qty} u.`,
                qty,
                variant,
                disabled: qty <= 0,
              };
            })
        : [],
    [product, resolvedColor, lockedOriginId]
  );

  const selectableSizes = sizeOptions.filter((option) => !option.disabled);
  const resolvedSize =
    sizeOptions.find((option) => option.value === selectedSize && !option.disabled)?.value ||
    (selectableSizes.length === 1 ? selectableSizes[0]?.value || "" : "");

  const selectedVariant = useMemo(() => {
    if (!product || !resolvedColor || !resolvedSize) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          variant.color_name === resolvedColor && variant.size_code === resolvedSize
      ) || null
    );
  }, [product, resolvedColor, resolvedSize]);

  const selectedSource =
    selectedVariant?.candidate_sources.find((source) => source.location_id === lockedOriginId) ||
    null;
  const duplicateMessage =
    selectedVariant && duplicateDraftVariant?.variantId === selectedVariant.variant_id
      ? duplicateDraftVariant.message
      : null;
  const normalizedQuantity = String(
    clampQuantity(Number(quantity) || 1, 1, selectedSource?.qty_available)
  );
  const canSubmit =
    !!selectedVariant &&
    !!selectedSource &&
    Number.isInteger(Number(normalizedQuantity)) &&
    Number(normalizedQuantity) > 0;
  const quantityStepEnabled = !!selectedVariant && !!selectedSource;

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-xl font-semibold text-[var(--ops-text)]">
              {product.style_name}
            </h3>
            <span className="inline-flex shrink-0 items-center rounded-full bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_92%,var(--ops-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-muted)]">
              {selectedVariant?.sku || product.secondary_code}
            </span>
          </div>
        </div>

        {duplicateMessage ? (
          <div className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm text-[color:color-mix(in_srgb,#dc2626_88%,var(--ops-text))] md:min-w-[280px] md:justify-end">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{duplicateMessage}</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface)_98%,var(--ops-surface-muted))] p-4">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <FieldLabel>Color</FieldLabel>
            <OpsSelectMenu
              value={resolvedColor}
              onValueChange={(value) => {
                setSelectedColor(value);
                setSelectedSize("");
              }}
              placeholder={lockedOriginId ? "Elegir color" : "Selecciona origen primero"}
              options={colorOptions}
              disabled={!lockedOriginId || colorOptions.length === 0}
              triggerContent={(option) =>
                option ? (
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate text-[var(--ops-text)]">{option.label}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]">
                      {option.helper}
                    </span>
                  </span>
                ) : null
              }
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Talla</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.length > 0 ? (
                sizeOptions.map((sizeOption) => {
                  const active = sizeOption.value === resolvedSize;

                  return (
                    <button
                      key={sizeOption.value}
                      type="button"
                      disabled={sizeOption.disabled}
                      onClick={() => setSelectedSize(sizeOption.value)}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition",
                        active
                          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_42%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_86%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"
                        : sizeOption.disabled
                            ? "cursor-not-allowed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_84%,var(--ops-surface))] text-[var(--ops-text-muted)] opacity-65"
                            : "cursor-pointer border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text)] hover:border-[var(--ripnel-accent)] hover:bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_38%,var(--ops-surface))]"
                      )}
                    >
                      <span className="font-semibold">{sizeOption.value}</span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          active
                            ? "text-[var(--ripnel-accent-hover)]"
                            : sizeOption.disabled
                              ? "text-[var(--ops-text-muted)]"
                              : "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]"
                        )}
                      >
                        {sizeOption.qty} u.
                      </span>
                    </button>
                  );
                })
              ) : (
                <div
                  className={cn(
                    softPanelClass,
                    "flex min-h-10 items-center rounded-xl px-3 text-sm text-[var(--ops-text-muted)] sm:col-span-2 xl:col-span-3"
                  )}
                >
                  {lockedOriginId ? "Selecciona color" : "Selecciona origen primero"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
              <div className="space-y-1.5">
                <FieldLabel>Cantidad solicitada</FieldLabel>
                <OpsQuantityStepper
                  value={normalizedQuantity}
                  onChange={(nextValue) =>
                    setQuantity(
                      String(
                        clampQuantity(
                          Number(nextValue) || 1,
                          1,
                          selectedSource?.qty_available
                        )
                      )
                    )
                  }
                  onDecrement={() => {
                    const nextValue = clampQuantity(
                      Number(normalizedQuantity) - 1,
                      1,
                      selectedSource?.qty_available
                    );
                    setQuantity(String(nextValue));
                  }}
                  onIncrement={() => {
                    const nextValue = clampQuantity(
                      Number(normalizedQuantity) + 1,
                      1,
                      selectedSource?.qty_available
                    );
                    setQuantity(String(nextValue));
                  }}
                  disabled={!quantityStepEnabled}
                  max={selectedSource?.qty_available}
                />
              </div>

              <div className="flex flex-col gap-2 md:min-h-10 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] text-[var(--ops-text-muted)] md:text-right">
                  {selectedSource ? (
                    <>
                      Máximo disponible:{" "}
                      <span className="font-semibold text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]">
                        {selectedSource.qty_available} u.
                      </span>
                    </>
                  ) : (
                    "Selecciona una variante disponible."
                  )}
                </p>

                <Button
                  type="button"
                  variant={canSubmit ? "accent" : "outline"}
                  disabled={!canSubmit}
                  onClick={() => {
                    if (!selectedVariant || !selectedSource || !canSubmit) return;
                    onAdd(selectedVariant, selectedSource, Number(normalizedQuantity));
                    setQuantity("1");
                  }}
                  className="h-10 rounded-lg px-4 md:shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Agregar línea
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequestDraftTable({
  draftLines,
  onUpdateLineQty,
  onRemoveLine,
  highlightedVariantId,
  highlightToken,
  disabled = false,
}: {
  draftLines: DraftLine[];
  onUpdateLineQty: (variantId: string, rawValue: string) => void;
  onRemoveLine: (variantId: string) => void;
  highlightedVariantId?: string | null;
  highlightToken?: number;
  disabled?: boolean;
}) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!highlightedVariantId || !highlightToken) {
      return;
    }

    const row = rowRefs.current[highlightedVariantId];
    row?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [highlightToken, highlightedVariantId]);

  return (
    <section>
      <OpsTableWrap minWidth="860px">
        <div className="max-h-[430px] overflow-y-auto">
          <table className="w-full border-collapse">
            <colgroup>
              <col />
              <col className="w-[104px]" />
              <col className="w-[72px]" />
              <col className="w-[88px]" />
              <col className="w-[132px]" />
              <col className="w-[56px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[var(--ops-surface-muted)]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                <th className="px-4 py-3">Producto</th>
                <th className="px-3 py-3">Color</th>
                <th className="px-3 py-3">Talla</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3 text-center">Cantidad</th>
                <th className="px-2 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
              {draftLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-[var(--ops-text-muted)]"
                  >
                    Aún no agregas productos a la transferencia.
                  </td>
                </tr>
              ) : (
                draftLines.map((line) => (
                  <tr
                    key={`${line.variant_id}:${highlightedVariantId === line.variant_id ? highlightToken || 0 : 0}`}
                    ref={(node) => {
                      rowRefs.current[line.variant_id] = node;
                    }}
                    className={cn(
                      "transition hover:bg-[var(--ops-surface-muted)]",
                      highlightedVariantId === line.variant_id
                        ? "animate-[transfer-draft-row-flash_1800ms_ease-out]"
                        : null
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {line.style_name}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ops-text-muted)]">
                        {line.sku}
                      </p>
                    </td>

                    <td className="px-3 py-2.5 text-sm text-[var(--ops-text)]">
                      {line.color_name}
                    </td>

                    <td className="px-3 py-2.5 text-sm font-medium text-[var(--ops-text)]">
                      {line.size_code}
                    </td>

                    <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                      {line.qty} u.
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex justify-center">
                        <OpsQuantityStepper
                          value={line.qty_requested}
                          onChange={(value) => onUpdateLineQty(line.variant_id, value)}
                          onIncrement={() => onUpdateLineQty(line.variant_id, String(Math.min(line.qty_requested + 1, line.qty)))}
                          onDecrement={() => onUpdateLineQty(line.variant_id, String(Math.max(line.qty_requested - 1, 1)))}
                          disabled={disabled}
                          max={line.qty}
                          className="w-[120px]"
                        />
                      </div>
                    </td>

                    <td className="px-2 py-2.5">
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={disabled}
                          onClick={() => onRemoveLine(line.variant_id)}
                          className="rounded-lg text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                          aria-label="Quitar línea"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OpsTableWrap>
    </section>
  );
}

export function DraftSummaryPanel({
  draftLines,
  destinationName,
  destinationType,
  originName,
  originType,
  originSelected,
  submittedSummary,
  notes,
  onNotesChange,
  noteMode,
  selectedNotePreset,
  notePresetOptions,
  onSelectNotePreset,
  onNoteModeChange,
  onClearNotes,
  notesMaxLength,
  submittedTransfer,
  onViewSubmittedTransfer,
  onStartNewRequest,
  submitting,
  onSubmit,
}: {
  draftLines: DraftLine[];
  destinationName: string;
  destinationType?: string | null;
  originName: string;
  originType?: string | null;
  originSelected: boolean;
  submittedSummary: {
    originName: string;
    originType: string | null;
    destinationName: string;
    destinationType: string | null;
    lines: number;
    units: number;
    notes: string | null;
    transferNumber: string | null;
  } | null;
  notes: string;
  onNotesChange: (value: string) => void;
  noteMode: "preset" | "manual";
  selectedNotePreset: string;
  notePresetOptions: OpsOption[];
  onSelectNotePreset: (value: string) => void;
  onNoteModeChange: (mode: "preset" | "manual") => void;
  onClearNotes: () => void;
  notesMaxLength: number;
  submittedTransfer: { transfer_id: string; transfer_number: string | null } | null;
  onViewSubmittedTransfer: () => void;
  onStartNewRequest: () => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const totals = useMemo(() => {
    if (submittedSummary) {
      return {
        lines: submittedSummary.lines,
        units: submittedSummary.units,
      };
    }

    return {
      lines: draftLines.length,
      units: draftLines.reduce((accumulator, line) => accumulator + line.qty_requested, 0),
    };
  }, [draftLines, submittedSummary]);

  const allQuantitiesValid = draftLines.every(
    (line) => Number.isInteger(line.qty_requested) && line.qty_requested > 0 && line.qty_requested <= line.qty
  );
  const activeOriginName = submittedSummary?.originName || originName;
  const activeOriginType = submittedSummary?.originType ?? originType;
  const activeDestinationName = submittedSummary?.destinationName || destinationName;
  const activeDestinationType = submittedSummary?.destinationType ?? destinationType;
  const activeNotes = submittedSummary?.notes ?? notes;
  const validations = [
    { label: "Origen seleccionado", ok: submittedTransfer ? true : originSelected },
    { label: "Destino actual resuelto", ok: Boolean(activeDestinationName) },
    { label: "Al menos una línea agregada", ok: submittedTransfer ? totals.lines > 0 : draftLines.length > 0 },
    {
      label: "Cantidades válidas",
      ok: submittedTransfer ? totals.lines > 0 : draftLines.length > 0 && allQuantitiesValid,
    },
  ];
  const canSubmit = validations.every((item) => item.ok) && !submitting && !submittedTransfer;
  const noteCounter = `${notes.length}/${notesMaxLength}`;

  return (
    <aside className={cn(panelClass, "space-y-4 p-5")}>
      <section className="space-y-2">
        <FieldLabel>Estado</FieldLabel>
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          {submittedTransfer ? "Solicitud enviada correctamente" : "Borrador listo para revisión"}
        </p>
        {submittedTransfer?.transfer_number ? (
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--ripnel-accent-hover)]">
            {submittedTransfer.transfer_number}
          </p>
        ) : null}
        {submittedTransfer ? (
          <p className="text-sm text-[var(--ops-text-muted)]">
            La solicitud quedó registrada y lista para seguimiento.
          </p>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>Ruta</FieldLabel>
        <div className="flex items-center gap-2 text-sm">
          <OpsLocationIcon type={activeOriginType} className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <span className="min-w-0 truncate font-semibold text-[var(--ripnel-accent-hover)]">
            {activeOriginName || "Seleccionar origen"}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <OpsLocationIcon type={activeDestinationType} className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <span className="min-w-0 truncate font-semibold text-[var(--ops-text)]">
            {activeDestinationName}
          </span>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>Total</FieldLabel>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">Líneas</span>
            <span className="font-semibold text-[var(--ops-text)]">{totals.lines}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">Unidades</span>
            <span className="font-semibold text-[var(--ops-text)]">{totals.units}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>Validaciones</FieldLabel>
        <div className="space-y-2">
          {validations.map((item) => (
            <ValidationItem key={item.label} label={item.label} ok={item.ok} />
          ))}
        </div>
      </section>

      <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="transfer-request-notes"
            className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
          >
            Notas
          </label>

          {!submittedTransfer ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNoteModeChange(noteMode === "preset" ? "manual" : "preset")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]"
              >
                {noteMode === "preset" ? (
                  <>
                    <PencilLine className="h-3.5 w-3.5" />
                    Editar
                  </>
                ) : (
                  <>
                    <ListRestart className="h-3.5 w-3.5" />
                    Usar opciones
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClearNotes}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--ops-text-muted)] transition hover:bg-[color:color-mix(in_srgb,#dc2626_8%,transparent)] hover:text-[color:color-mix(in_srgb,#dc2626_88%,var(--ops-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,#dc2626_18%,transparent)]"
              >
                <Eraser className="h-3.5 w-3.5" />
                Limpiar
              </button>
            </div>
          ) : null}
        </div>

        {submittedTransfer ? (
          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-3 text-sm text-[var(--ops-text)]">
            {activeNotes || "Sin notas"}
          </div>
        ) : noteMode === "preset" ? (
          <OpsSelectMenu
            value={selectedNotePreset}
            onValueChange={onSelectNotePreset}
            placeholder="Selecciona un motivo frecuente"
            options={notePresetOptions}
            triggerContent={(option) =>
              option ? (
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                  <span className="truncate text-[var(--ops-text)]">{option.label}</span>
                </span>
              ) : null
            }
          />
        ) : (
          <div className="space-y-1.5">
            <AdminTextarea
              id="transfer-request-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={4}
              maxLength={notesMaxLength}
              placeholder="Motivo de la transferencia"
              className="min-h-[110px] rounded-xl border-[var(--ops-border-strong)] bg-[var(--ops-field)]"
            />
            <div className="flex justify-end">
              <span className="text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
                {noteCounter}
              </span>
            </div>
          </div>
        )}
      </div>

      {submittedTransfer ? (
        <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
          <Button
            type="button"
            variant="accent"
            className="h-10 w-full rounded-lg px-4"
            onClick={onStartNewRequest}
          >
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-lg px-4"
            onClick={onViewSubmittedTransfer}
          >
            <ArrowUpRight className="h-4 w-4" />
            Ver detalle
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          disabled={!canSubmit}
          variant="accent"
          className="h-11 w-full rounded-lg px-4"
          onClick={onSubmit}
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Enviar solicitud de transferencia
        </Button>
      )}
    </aside>
  );
}
