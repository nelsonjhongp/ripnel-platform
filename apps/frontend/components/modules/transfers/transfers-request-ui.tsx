"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PresetTextField } from "@/components/ui/preset-text-field";
import { cn } from "@/lib/utils";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { OpsTableWrap } from "@/components/ui/ops-page-shell";
import { Pagination } from "@/components/ui/pagination";
import type {
  DraftLine,
  RequestCandidateSource,
  RequestLocationOption,
  RequestProductGroup,
  RequestProductVariant,
} from "./transfers-shared"
import { OpsLocationIcon } from "@/components/ui/ops-location-icon"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { TRANS } from "./transfers-messages"

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
          ? "text-[var(--ops-tone-success-text)]"
          : "text-[var(--ops-tone-warning-text)]"
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
  const selectedOriginLabel = selectedOrigin?.label || TRANS.request.selectOrigin;
  return (
    <section
      className={cn(
        panelClass,
        "space-y-2.5 bg-[var(--ops-surface-muted)] p-4 sm:p-5"
      )}
    >
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] md:items-end">
        <div className="min-w-0 space-y-2">
          <FieldLabel>{TRANS.request.originLabel}</FieldLabel>
          <OpsSelect
            value={originValue}
            onChange={onOriginChange}
            placeholder={TRANS.request.selectOrigin}
            options={originOptions.map((o) => ({ value: o.value, label: o.label }))}
            disabled={disabled}
            className="sales-field sales-field-interactive flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border-[color:color-mix(in_srgb,var(--ops-border-strong)_88%,var(--ripnel-accent)_12%)] bg-[var(--ops-surface)] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none"
            triggerContent={(opt) => (
              <div className="flex min-w-0 items-center gap-3">
                <OpsLocationIcon
                  type={selectedOrigin?.type}
                  className="h-4 w-4 shrink-0 text-[var(--ops-text)]"
                />
                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                  {opt?.label ?? selectedOriginLabel}
                </p>
              </div>
            )}
          />
        </div>

        <div className="hidden items-center justify-center pb-3 md:flex">
          <ArrowRight className="h-4 w-4 text-[var(--ops-text)]" />
        </div>

        <div className="min-w-0 space-y-2">
          <FieldLabel>{TRANS.request.destinationLabel}</FieldLabel>
          <div className="sales-field flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border-[var(--ops-tone-success-border)] bg-[var(--ops-surface)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="flex min-w-0 items-center gap-3">
              <OpsLocationIcon
                type={destinationType}
                className="h-4 w-4 shrink-0 text-[var(--ops-text)]"
              />
              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                {destinationName}
              </p>
              <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ops-tone-success-text)]">
                {TRANS.scope.current}
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
          {TRANS.request.changeOriginWarning}
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
            <span className="text-[11px] font-semibold text-[var(--ops-tone-success-text)]">
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
            <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--ops-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-muted)]">
              {selectedVariant?.sku || product.secondary_code}
            </span>
          </div>
        </div>

        {duplicateMessage ? (
          <div className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm text-[var(--ops-tone-danger-text)] md:min-w-[280px] md:justify-end">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{duplicateMessage}</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface)] p-4">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <FieldLabel>{TRANS.request.colorLabel}</FieldLabel>
            <OpsSelect
              value={resolvedColor}
              onValueChange={(value) => {
                setSelectedColor(value);
                setSelectedSize("");
              }}
              placeholder={lockedOriginId ? TRANS.request.selectColor : TRANS.request.selectOriginFirst}
              options={colorOptions}
              disabled={!lockedOriginId || colorOptions.length === 0}
              triggerContent={(option) =>
                option ? (
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate text-[var(--ops-text)]">{option.label}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-[var(--ops-tone-success-text)]">
                      {option.helper}
                    </span>
                  </span>
                ) : null
              }
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>{TRANS.request.sizeLabel}</FieldLabel>
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
                            ? "cursor-not-allowed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)] opacity-65"
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
                              : "text-[var(--ops-tone-success-text)]"
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
                  {lockedOriginId ? TRANS.request.selectColor : TRANS.request.selectOriginFirst}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
              <div className="space-y-1.5">
                <FieldLabel>{TRANS.request.qtyRequestedLabel}</FieldLabel>
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
                      {TRANS.request.maxAvailable}{" "}
                      <span className="font-semibold text-[var(--ops-tone-success-text)]">
                        {selectedSource.qty_available} u.
                      </span>
                    </>
                  ) : !resolvedColor ? (
                    TRANS.request.selectColor
                  ) : !resolvedSize ? (
                    TRANS.request.selectSize
                  ) : !selectedVariant ? (
                    TRANS.request.variantNotAvailable
                  ) : (
                    TRANS.request.noStockAtOrigin
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
                  {TRANS.request.addLine}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DRAFT_TABLE_PAGE_SIZE = 5;

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
  const [draftPage, setDraftPage] = useState(1);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const totalDraftPages = Math.max(1, Math.ceil(draftLines.length / DRAFT_TABLE_PAGE_SIZE));
  const safeDraftPage = Math.min(Math.max(draftPage, 1), totalDraftPages);
  const paginatedLines = draftLines.slice(
    (safeDraftPage - 1) * DRAFT_TABLE_PAGE_SIZE,
    safeDraftPage * DRAFT_TABLE_PAGE_SIZE
  );

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
                <th className="px-4 py-3">{TRANS.table.columns.products}</th>
                <th className="px-3 py-3">{TRANS.request.colorLabel}</th>
                <th className="px-3 py-3">{TRANS.request.sizeLabel}</th>
                <th className="px-3 py-3 text-right">{TRANS.metrics.available}</th>
                <th className="px-3 py-3 text-center">{TRANS.manage.qtyLabel}</th>
                <th className="px-2 py-3 text-center">{TRANS.table.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
              {draftLines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-[var(--ops-text-muted)]"
                  >
                    {TRANS.request.noProducts}
                  </td>
                </tr>
              ) : (
                paginatedLines.map((line) => (
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
                          className="rounded-lg text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-tone-danger-text)]"
                          aria-label={TRANS.request.removeLine}
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
        {draftLines.length > DRAFT_TABLE_PAGE_SIZE ? (
          <Pagination
            page={safeDraftPage}
            totalPages={totalDraftPages}
            onPageChange={setDraftPage}
            className="border-t border-[var(--ops-border-strong)] px-4 py-2"
          />
        ) : null}
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
  onClearNotes,
  notesMaxLength,
  notePresets,
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
  onClearNotes: () => void;
  notesMaxLength: number;
  notePresets: readonly string[];
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
    { label: "Al menos una linea agregada", ok: submittedTransfer ? totals.lines > 0 : draftLines.length > 0 },
    {
      label: "Cantidades validas",
      ok: submittedTransfer ? totals.lines > 0 : draftLines.length > 0 && allQuantitiesValid,
    },
  ];
  const canSubmit = validations.every((item) => item.ok) && !submitting && !submittedTransfer;

  return (
    <aside className={cn(panelClass, "space-y-4 p-5")}>
      <section className="space-y-2">
        <FieldLabel>{TRANS.request.status}</FieldLabel>
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          {submittedTransfer ? TRANS.request.sentSuccess : TRANS.pending.draftReady}
        </p>
        {submittedTransfer?.transfer_number ? (
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--ripnel-accent-hover)]">
            {submittedTransfer.transfer_number}
          </p>
        ) : null}
        {submittedTransfer ? (
          <p className="text-sm text-[var(--ops-text-muted)]">
            La solicitud quedo registrada y lista para seguimiento.
          </p>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>{TRANS.request.route}</FieldLabel>
        <div className="flex items-center gap-2 text-sm">
          <OpsLocationIcon type={activeOriginType} className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <span className="min-w-0 truncate font-semibold text-[var(--ripnel-accent-hover)]">
            {activeOriginName || TRANS.request.selectOrigin}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <OpsLocationIcon type={activeDestinationType} className="h-4 w-4 shrink-0 text-[var(--ops-text)]" />
          <span className="min-w-0 truncate font-semibold text-[var(--ops-text)]">
            {activeDestinationName}
          </span>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>{TRANS.request.total}</FieldLabel>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">{TRANS.request.lines}</span>
            <span className="font-semibold text-[var(--ops-text)]">{totals.lines}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">{TRANS.request.units}</span>
            <span className="font-semibold text-[var(--ops-text)]">{totals.units}</span>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--ops-border-strong)] pt-4">
        <FieldLabel>{TRANS.request.validations}</FieldLabel>
        <div className="space-y-2">
          {validations.map((item) => (
            <ValidationItem key={item.label} label={item.label} ok={item.ok} />
          ))}
        </div>
      </section>

      <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
        {submittedTransfer ? (
          <>
            <label
              htmlFor="transfer-request-notes"
              className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
            >
              {TRANS.request.notesLabel}
            </label>
            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-3 text-sm text-[var(--ops-text)]">
              {activeNotes || "Sin notas"}
            </div>
          </>
        ) : (
          <PresetTextField
            label={TRANS.request.notesLabel}
            value={notes}
            onChange={onNotesChange}
            presets={notePresets}
            placeholder={TRANS.request.selectPreset}
            maxLength={notesMaxLength}
            onClear={onClearNotes}
            textareaRows={4}
            textareaClassName="min-h-[110px]"
          />
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
            {TRANS.header.requestTitle}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-lg px-4"
            onClick={onViewSubmittedTransfer}
          >
            <ArrowUpRight className="h-4 w-4" />
            {TRANS.header.viewDetail}
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
          {TRANS.request.submitRequest}
        </Button>
      )}
    </aside>
  );
}
