"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MovementType = "IN" | "OUT" | "ADJUST";

type KardexMovement = {
  movement_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  movement_type: MovementType;
  quantity: number;
  quantity_effect: number;
  balance_qty: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

function formatMovementTypeLabel(type: MovementType) {
  if (type === "IN") return "Entrada";
  if (type === "OUT") return "Salida";
  return "Ajuste";
}

function formatReference(movement: KardexMovement) {
  if (movement.reference_type && movement.reference_id) {
    return `${movement.reference_type}:${movement.reference_id.slice(0, 8)}`;
  }
  if (movement.reference_type) return movement.reference_type;
  return movement.reason || "Sin referencia";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]";
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
        : "text-[var(--ops-text-muted)]";
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", valueClass)}>{value}</span>
    </div>
  );
}

export default function KardexPage() {
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [movementType, setMovementType] = useState<"ALL" | MovementType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  async function loadKardex() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl("/api/inventory/kardex"), {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar kardex");
      }
      setMovements(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar kardex"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadKardex());
  }, []);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesType =
        movementType === "ALL" || movement.movement_type === movementType;
      const reference = formatReference(movement).toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        movement.sku.toLowerCase().includes(normalizedQuery) ||
        movement.style_name.toLowerCase().includes(normalizedQuery) ||
        movement.style_code.toLowerCase().includes(normalizedQuery) ||
        movement.location_name.toLowerCase().includes(normalizedQuery) ||
        reference.includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [movements, query, movementType]);

  const totals = useMemo(() => {
    return filteredMovements.reduce(
      (acc, movement) => {
        if (movement.quantity_effect > 0) {
          acc.entries += movement.quantity_effect;
        }
        if (movement.quantity_effect < 0) {
          acc.exits += Math.abs(movement.quantity_effect);
        }
        if (movement.movement_type === "ADJUST") {
          acc.adjustments += 1;
        }
        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0 }
    );
  }, [filteredMovements]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMovements = filteredMovements.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const firstVisible = filteredMovements.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastVisible = Math.min(safePage * pageSize, filteredMovements.length);

  function handleFilterChange(fn: () => void) {
    fn();
    setCurrentPage(1);
  }

  const hasActiveFilters = query !== "" || movementType !== "ALL";

  return (
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-[1180px] space-y-4">
        <PosHeader
          eyebrow="Trazabilidad de stock"
          title="Kardex"
          actions={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => loadKardex()}
                    disabled={loading}
                    className="rounded-lg"
                    aria-label="Actualizar kardex"
                  >
                    {loading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar kardex</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="Entradas" value={totals.entries} tone="accent" />
          <MetricPill label="Salidas" value={totals.exits} tone="warning" />
          <MetricPill label="Ajustes" value={totals.adjustments} />
        </div>

        <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Buscar
              </label>
              <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                <Search className="h-4 w-4 text-[var(--ops-text-muted)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
                  placeholder="Buscar por SKU, producto, ubicación o referencia"
                  className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                />
              </div>
            </div>

            <FilterDropdown
              label="Tipo"
              value={movementType}
              options={[
                { value: "ALL", label: "Todos" },
                { value: "IN", label: "Entradas" },
                { value: "OUT", label: "Salidas" },
                { value: "ADJUST", label: "Ajustes" },
              ]}
              onChange={(v) => handleFilterChange(() => setMovementType(v as "ALL" | MovementType))}
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleFilterChange(() => {
                      setQuery("");
                      setMovementType("ALL");
                    })}
                    disabled={!hasActiveFilters}
                    className="rounded-lg"
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {error ? (
            <InlineStatusCard title="No pudimos cargar el kardex" description={error} tone="danger" variant="ops" />
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[1080px] border-y border-[var(--ops-border-strong)]">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Ref.</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        <LoaderCircle className="mr-2 inline-block h-4 w-4 animate-spin" />
                        Cargando kardex...
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        {movements.length === 0
                          ? "No existen movimientos registrados."
                          : "No existen movimientos para los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    paginatedMovements.map((movement) => (
                      <tr
                        key={movement.movement_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)]">
                          {formatDateTime(movement.created_at)}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {movement.sku}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                          {movement.style_name}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)] hidden sm:table-cell">
                          {formatReference(movement)}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              movement.movement_type === "IN" &&
                                "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]",
                              movement.movement_type === "OUT" &&
                                "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]",
                              movement.movement_type === "ADJUST" &&
                                "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text-muted)]"
                            )}
                          >
                            {movement.movement_type === "IN" && (
                              <ArrowUpCircle className="h-3 w-3" />
                            )}
                            {movement.movement_type === "OUT" && (
                              <ArrowDownCircle className="h-3 w-3" />
                            )}
                            {formatMovementTypeLabel(movement.movement_type)}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                            movement.quantity_effect >= 0
                              ? "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]"
                              : "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]"
                          )}
                        >
                          {movement.quantity_effect >= 0 ? "+" : ""}
                          {movement.quantity_effect}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                          {movement.location_name}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)]">
                          {movement.created_by_name || "Sistema"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
            <span className="text-[var(--ops-text-muted)]">
              {filteredMovements.length === 0
                ? "0 resultados"
                : `${firstVisible}-${lastVisible} de ${filteredMovements.length}`}
            </span>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="self-end md:self-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
