"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ClipboardList,
  LoaderCircle,
  Store,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AdminInlineMessage,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import { OpsSelectMenu, type OpsOption } from "@/components/ui/ops-selection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export type RequestLocationOption = {
  value: string;
  label: string;
};

const panelClass = "rounded-[22px] border border-[#E7E2EE] bg-white";
const softPanelClass = "rounded-[18px] border border-[#EFEAF4] bg-[#FCFBFE]";
const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7C7190]";

function formatLineSummary(lines: number, units: number) {
  return `${lines} ${lines === 1 ? "línea" : "líneas"} · ${units} ${units === 1 ? "unidad" : "unidades"}`;
}

export function StockBadge({
  qty,
  blocked = false,
}: {
  qty: number;
  blocked?: boolean;
}) {
  const toneClass = blocked
    ? "border-[#E7E2EE] bg-[#F8F5FB] text-[#8A8098]"
    : qty > 0
      ? "border-[color:color-mix(in_srgb,#10b981_20%,#E7E2EE)] bg-[color:color-mix(in_srgb,#10b981_10%,white)] text-[#0F8A5F]"
      : "border-[#E7E2EE] bg-[#F8F5FB] text-[#8A8098]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
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
        "sales-field h-10 w-full rounded-lg border-[#E7E2EE] bg-white px-3 text-sm text-[var(--ops-text)] disabled:cursor-not-allowed disabled:bg-[#F8F5FB] disabled:text-[var(--ops-text-muted)]",
        className
      )}
    />
  );
}

function FieldLabel({ children }: { children: string }) {
  return <p className={fieldLabelClass}>{children}</p>;
}

function StaticField({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={cn(
          softPanelClass,
          "min-h-10 px-3 py-2 text-sm",
          tone === "success" ? "text-[#0F8A5F]" : "text-[var(--ops-text)]"
        )}
      >
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function RequestRouteField({
  originOptions,
  originValue,
  onOriginChange,
  destinationName,
  hasDraftLines,
}: {
  originOptions: RequestLocationOption[];
  originValue: string;
  onOriginChange: (value: string) => void;
  destinationName: string;
  hasDraftLines: boolean;
}) {
  const selectedOriginLabel =
    originOptions.find((option) => option.value === originValue)?.label ||
    "Seleccionar origen";

  return (
    <section className="space-y-2.5">
      <FieldLabel>Movimiento</FieldLabel>

      <div className={cn(softPanelClass, "px-3 py-3.5")}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-[#EFEAF4] bg-white px-3.5 py-3 text-left transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,#E7E2EE)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,transparent)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,#f97316_10%,white)] text-[#C96C1D]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#C96C1D]">Origen</p>
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {selectedOriginLabel}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#8A8098]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-[#E7E2EE] bg-white p-1"
            >
              <DropdownMenuRadioGroup value={originValue} onValueChange={onOriginChange}>
                {originOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--ops-text)] focus:bg-[#F8F5FB] focus:text-[var(--ops-text)]"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center justify-center text-[#968AA7]">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#EFEAF4] bg-white px-3.5 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--ripnel-accent)_8%,white)] text-[var(--ripnel-accent)]">
              <Store className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#7C7190]">Destino</p>
              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                {destinationName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasDraftLines ? (
        <p className="text-xs text-[#8A8098]">
          Cambiar el origen reinicia las líneas actuales de la solicitud.
        </p>
      ) : null}
    </section>
  );
}

export function RequestProductComposer({
  product,
  lockedOriginId,
  onAdd,
  onClear,
}: {
  product: RequestProductGroup | null;
  lockedOriginId: string;
  onAdd: (variant: RequestProductVariant, source: RequestCandidateSource, quantity: number) => void;
  onClear: () => void;
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

  const needsColorSelection = colors.length > 1;
  const needsSizeSelection = sizes.length > 1;

  const [selectedColor, setSelectedColor] = useState(colors.length === 1 ? colors[0] : "");
  const [selectedSize, setSelectedSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [quantity, setQuantity] = useState("1");

  const resolvedColor = needsColorSelection ? selectedColor : colors[0] || "";
  const resolvedSize = needsSizeSelection ? selectedSize : sizes[0] || "";

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
  const parsedQuantity = Number(quantity);
  const quantityError =
    selectedSource &&
    (!Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > selectedSource.qty_available)
      ? `La cantidad debe estar entre 1 y ${selectedSource.qty_available}.`
      : null;
  const canSubmit =
    !!selectedVariant &&
    !!selectedSource &&
    !quantityError &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0;

  const colorOptions = colors.map((color) => ({ value: color, label: color })) satisfies OpsOption[];
  const sizeOptions = sizes.map((size) => ({ value: size, label: size })) satisfies OpsOption[];
  const stockLabel = selectedSource
    ? `${selectedSource.qty_available} u.`
    : lockedOriginId
      ? "Sin stock disponible"
      : "Selecciona un origen";

  if (!product) {
    return null;
  }

  return (
    <section className={cn(panelClass, "space-y-4 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={fieldLabelClass}>Producto seleccionado</p>
          <h3 className="mt-1 truncate text-xl font-semibold text-[var(--ops-text)]">
            {product.style_name}
          </h3>
          <p className="mt-1 text-sm text-[#7C7190]">{product.secondary_code}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          className="rounded-lg text-[#8A8098] hover:bg-[#F8F5FB] hover:text-[var(--ops-text)]"
          aria-label="Limpiar producto seleccionado"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {needsColorSelection ? (
          <div className="space-y-1.5">
            <FieldLabel>Color</FieldLabel>
            <OpsSelectMenu
              value={selectedColor}
              onValueChange={setSelectedColor}
              placeholder="Elegir color"
              options={colorOptions}
            />
          </div>
        ) : (
          <StaticField label="Color" value={resolvedColor || "Pendiente"} />
        )}

        {needsSizeSelection ? (
          <div className="space-y-1.5">
            <FieldLabel>Talla</FieldLabel>
            <OpsSelectMenu
              value={selectedSize}
              onValueChange={setSelectedSize}
              placeholder="Elegir talla"
              options={sizeOptions}
            />
          </div>
        ) : (
          <StaticField label="Talla" value={resolvedSize || "Pendiente"} />
        )}

        <StaticField label="Stock disponible" value={stockLabel} tone="success" />
      </div>

      <div className={cn(softPanelClass, "px-4 py-3 text-sm text-[#7C7190]")}>
        {!lockedOriginId ? (
          <p>Selecciona una sede de origen para habilitar la reposición.</p>
        ) : selectedVariant && !selectedSource ? (
          <p>La combinación elegida no tiene stock en la sede origen seleccionada.</p>
        ) : (
          <p>
            Ajusta la cantidad y agrega la línea al resumen de solicitud.
          </p>
        )}
      </div>

      <div className="grid gap-3 border-t border-[#EFEAF4] pt-4 md:grid-cols-[160px_minmax(0,1fr)] md:items-end">
        <div className="space-y-1.5">
          <FieldLabel>Cantidad</FieldLabel>
          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            disabled={!selectedSource}
            max={selectedSource?.qty_available}
          />
        </div>

        <Button
          type="button"
          variant={canSubmit ? "accent" : "outline"}
          disabled={!canSubmit}
          onClick={() => {
            if (!selectedVariant || !selectedSource || !canSubmit) return;
            onAdd(selectedVariant, selectedSource, parsedQuantity);
            onClear();
          }}
          className="h-10 rounded-lg px-4 md:w-full"
        >
          Agregar
        </Button>
      </div>

      {quantityError ? <AdminInlineMessage tone="danger">{quantityError}</AdminInlineMessage> : null}
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
    <aside className={cn(panelClass, "space-y-5 p-5 xl:sticky xl:top-20 xl:self-start")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--ripnel-accent)_8%,white)] text-[var(--ripnel-accent)]">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
              Resumen de solicitud
            </h2>
            <p className="mt-1 text-sm text-[#7C7190]">
              {formatLineSummary(totals.lines, totals.units)}
            </p>
          </div>
        </div>

        <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f59e0b_20%,#E7E2EE)] bg-[color:color-mix(in_srgb,#f59e0b_10%,white)] px-2.5 py-1 text-[11px] font-semibold text-[#B66A1B]">
          Pendiente de envío
        </span>
      </div>

      <section className={cn(softPanelClass, "space-y-2 px-4 py-3.5")}>
        <FieldLabel>Ruta</FieldLabel>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-[#C96C1D]">
            {originName || "Seleccionar origen"}
          </span>
          <ArrowRight className="h-4 w-4 text-[#968AA7]" />
          <span className="font-semibold text-[var(--ops-text)]">{destinationName}</span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--ops-text)]">
            Productos agregados
          </h3>
          <span className="text-xs text-[#8A8098]">
            {draftLines.length}
          </span>
        </div>

        {draftLines.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#E7E2EE] bg-[#FCFBFE] px-4 py-8 text-center text-sm text-[#8A8098]">
            Aún no agregas productos a la solicitud.
          </div>
        ) : (
          <div className="space-y-3">
            {draftLines.map((line) => (
              <div
                key={line.variant_id}
                className="rounded-[18px] border border-[#EFEAF4] bg-[#FCFBFE] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {line.style_name}
                    </p>
                    <p className="mt-1 text-sm text-[#7C7190]">
                      {line.color_name} · {line.size_code}
                    </p>
                    <p className="mt-1 text-[13px] text-[#0F8A5F]">
                      Stock disponible: {line.qty} u.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveLine(line.variant_id)}
                    className="rounded-lg text-[#8A8098] hover:bg-white hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                    aria-label="Quitar línea"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_84px] sm:items-end">
                  <div className="space-y-1.5">
                    <FieldLabel>Cantidad</FieldLabel>
                    <QuantityInput
                      value={line.qty_requested}
                      onChange={(value) => onUpdateLineQty(line.variant_id, value)}
                      max={line.qty}
                    />
                  </div>

                  <div className="flex items-end justify-start sm:justify-end">
                    <StockBadge qty={line.qty_requested} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cn(softPanelClass, "px-4 py-3.5")}>
        <FieldLabel>Total</FieldLabel>
        <p className="mt-2 text-base font-semibold text-[var(--ops-text)]">
          {formatLineSummary(totals.lines, totals.units)}
        </p>
      </section>

      <div className="space-y-1.5">
        <label
          htmlFor="transfer-request-notes"
          className="block text-sm font-medium text-[var(--ops-text)]"
        >
          Notas
        </label>
        <AdminTextarea
          id="transfer-request-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={4}
          placeholder="Motivo de la reposición"
          className="min-h-[110px] rounded-[18px] border-[#E7E2EE] bg-[#FCFBFE]"
        />
      </div>

      <Button
        type="button"
        disabled={submitting || draftLines.length === 0}
        variant="accent"
        className="h-11 w-full rounded-lg px-4"
        onClick={onSubmit}
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        Enviar solicitud
      </Button>
    </aside>
  );
}
