"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  RotateCcw,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AdminInlineMessage,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import { OpsTableBlock } from "@/components/ui/ops-page-shell";
import { cn } from "@/lib/utils";

export type RequestCandidateSource = {
  location_id: string;
  location_code: string;
  location_name: string;
  qty_available: number;
};

export type RequestCandidate = {
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_code: string;
  color_name: string;
  total_available: number;
  candidate_sources: RequestCandidateSource[];
};

export type RequestProductVariant = {
  variant_id: string;
  sku: string;
  size_code: string;
  color_name: string;
  total_available: number;
  candidate_sources: RequestCandidateSource[];
};

export type RequestProductGroup = {
  product_key: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  secondary_code: string;
  total_available: number;
  variants: RequestProductVariant[];
};

export type DraftLine = {
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_code: string;
  color_name: string;
  qty: number;
  qty_requested: number;
};

export function StockBadge({
  qty,
  blocked = false,
}: {
  qty: number;
  blocked?: boolean;
}) {
  const toneClass = blocked
    ? "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
    : qty > 0
      ? "border-[color:color-mix(in_srgb,#10b981_30%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#047857_72%,var(--ops-text))]"
      : "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        toneClass
      )}
    >
      {qty} u.
    </span>
  );
}

export function QuantityInput({
  value,
  onChange,
  disabled = false,
  min = 1,
  max,
  className,
}: {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "sales-field h-9 w-full rounded-lg px-3 py-1.5 text-sm text-[var(--ops-text)] disabled:cursor-not-allowed disabled:bg-[var(--ops-surface-muted)] disabled:text-[var(--ops-text-muted)]",
        className
      )}
    />
  );
}

export function LockedLocationField({
  value,
}: {
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        Destino
      </p>
      <div className="flex min-h-10 items-center rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 text-sm font-medium text-[var(--ops-text)]">
        {value}
      </div>
    </div>
  );
}

export function InlineVariantForm({
  product,
  lockedOriginId,
  onAdd,
  onCancel,
}: {
  product: RequestProductGroup | null;
  lockedOriginId: string;
  onAdd: (variant: RequestProductVariant, source: RequestCandidateSource, quantity: number) => void;
  onCancel: () => void;
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
  const sizes = useMemo(
    () =>
      product
        ? [...new Set(product.variants.map((variant) => variant.size_code))]
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
        : [],
    [product]
  );

  const [selectedColor, setSelectedColor] = useState(colors.length === 1 ? colors[0] : "");
  const [selectedSize, setSelectedSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [selectedOriginId, setSelectedOriginId] = useState(lockedOriginId || "");
  const [quantity, setQuantity] = useState("1");

  const selectedVariant = useMemo(() => {
    if (!product || !selectedColor || !selectedSize) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          variant.color_name === selectedColor && variant.size_code === selectedSize
      ) || null
    );
  }, [product, selectedColor, selectedSize]);

  const visibleSources = useMemo(() => {
    if (!selectedVariant) {
      return [];
    }

    return selectedVariant.candidate_sources.filter((source) =>
      lockedOriginId ? source.location_id === lockedOriginId : true
    );
  }, [lockedOriginId, selectedVariant]);

  const selectedSource =
    visibleSources.find((source) => source.location_id === selectedOriginId) || null;
  const parsedQuantity = Number(quantity);
  const quantityError =
    selectedSource &&
    (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > selectedSource.qty_available)
      ? `La cantidad debe estar entre 1 y ${selectedSource.qty_available}.`
      : null;
  const canSubmit =
    !!selectedVariant &&
    !!selectedSource &&
    !quantityError &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0;

  if (!product) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--ops-border-soft)] pb-3 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ripnel-accent-hover)]">
            Variante
          </p>
          <p className="text-lg font-semibold text-[var(--ops-text)]">{product.style_name}</p>
          <p className="text-sm text-[var(--ops-text-muted)]">{selectedVariant?.sku || product.secondary_code}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} className="rounded-lg">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectionBlock
            label="Color"
            options={colors}
            value={selectedColor}
            onChange={setSelectedColor}
          />
          <SelectionBlock
            label="Talla"
            options={sizes}
            value={selectedSize}
            onChange={setSelectedSize}
          />
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Orígenes disponibles
            </p>
            {lockedOriginId ? (
              <span className="text-xs text-[var(--ops-text-muted)]">
                Origen fijado por el borrador actual
              </span>
            ) : null}
          </div>

          {!selectedVariant ? (
            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-4 py-4 text-sm text-[var(--ops-text-muted)]">
              Selecciona color y talla para ver sedes con stock.
            </div>
          ) : visibleSources.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-4 py-4 text-sm text-[var(--ops-text-muted)]">
              Este producto no tiene stock disponible en otras sedes.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleSources.map((source) => {
                const selected = source.location_id === selectedOriginId;
                const blocked = !!lockedOriginId && source.location_id !== lockedOriginId;

                return (
                  <button
                    key={source.location_id}
                    type="button"
                    disabled={blocked}
                    onClick={() => setSelectedOriginId(source.location_id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition",
                      selected
                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)]"
                        : "border-[var(--ops-border-soft)] bg-[var(--ops-surface)] hover:bg-[var(--ops-surface-muted)]",
                      blocked && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ops-text)]">
                        {source.location_name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {source.location_code}
                      </p>
                    </div>
                    <StockBadge qty={source.qty_available} blocked={blocked} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-[minmax(0,180px)_1fr]">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Cantidad
            </p>
            <QuantityInput
              value={quantity}
              onChange={setQuantity}
              disabled={!selectedSource}
              max={selectedSource?.qty_available}
              className="max-w-[180px]"
            />
          </div>
          <div className="rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
            {selectedVariant ? (
              <>
                <p className="font-medium text-[var(--ops-text)]">
                  {selectedVariant.color_name} / {selectedVariant.size_code}
                </p>
                <p className="mt-1">
                  Selecciona una sede con stock y define cuántas unidades quieres agregar.
                </p>
              </>
            ) : (
              <p>Elige una combinación válida antes de agregarla al borrador.</p>
            )}
          </div>
        </div>

        {quantityError ? <AdminInlineMessage tone="danger">{quantityError}</AdminInlineMessage> : null}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg">Cancelar</Button>
        <Button
          type="button"
          variant="accent"
          disabled={!canSubmit}
          onClick={() => {
            if (!selectedVariant || !selectedSource || !canSubmit) return;
            onAdd(selectedVariant, selectedSource, parsedQuantity);
            onCancel();
          }}
          className="rounded-lg"
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}

function SelectionBlock({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected ? "" : option)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition",
                selected
                  ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ops-text)]"
                  : "border-[var(--ops-border-soft)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DraftSummaryPanel({
  draftLines,
  destinationName,
  originName,
  notes,
  onNotesChange,
  onUpdateLineQty,
  onRemoveLine,
  onResetOrigin,
  submitting,
  onSubmit,
}: {
  draftLines: DraftLine[];
  destinationName: string;
  originName: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onUpdateLineQty: (variantId: string, rawValue: string) => void;
  onRemoveLine: (variantId: string) => void;
  onResetOrigin: () => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const totals = useMemo(
    () => ({
      lines: draftLines.length,
      units: draftLines.reduce((accumulator, line) => accumulator + line.qty_requested, 0),
    }),
    [draftLines]
  );

  return (
    <OpsTableBlock className="xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[var(--ops-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">
            Solicitud en borrador
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
          Borrador
        </span>
      </div>

      {originName ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-[var(--ops-text)]">{originName}</span>
            <ArrowRight className="h-4 w-4 text-[var(--ripnel-accent)]" />
            <span className="font-semibold text-[var(--ops-text)]">{destinationName}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetOrigin}
            className="h-8 justify-start rounded-lg px-0 text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Cambiar origen
          </Button>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
        {draftLines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
            Aún no agregas productos al borrador.
          </div>
        ) : (
          <div className="space-y-3">
            {draftLines.map((line) => (
              <div
                key={line.variant_id}
                className="rounded-lg border border-[var(--ops-border-soft)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {line.style_name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {line.color_name} / {line.size_code}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                      {line.location_name} → {destinationName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveLine(line.variant_id)}
                    className="rounded-lg text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                    aria-label="Quitar línea"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_92px] sm:items-end">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Cantidad
                    </p>
                    <QuantityInput
                      value={line.qty_requested}
                      onChange={(value) => onUpdateLineQty(line.variant_id, value)}
                      max={line.qty}
                    />
                  </div>
                  <div className="text-right">
                    <StockBadge qty={line.qty} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1 rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-3">
        <p className="text-sm text-[var(--ops-text-muted)]">
          {totals.lines} líneas
        </p>
        <p className="text-base font-semibold text-[var(--ops-text)]">
          {totals.units} unidades
        </p>
      </div>

      <div>
        <label
          htmlFor="transfer-request-notes"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
        >
          Notas
        </label>
        <AdminTextarea
          id="transfer-request-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={3}
          placeholder="Motivo"
          className="min-h-[88px]"
        />
      </div>

      <Button
        type="button"
        disabled={submitting || draftLines.length === 0}
        variant="accent"
        className="w-full rounded-lg px-4"
        onClick={onSubmit}
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        Continuar revisión
      </Button>
    </OpsTableBlock>
  );
}
