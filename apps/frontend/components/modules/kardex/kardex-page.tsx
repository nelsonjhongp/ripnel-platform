"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import { Pagination } from "@/components/ui/pagination";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MovementType = "IN" | "OUT" | "ADJUST";
type MovementOperationFilter = "ALL" | "IN" | "OUT" | "ADJUST" | "TRANSFER";

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

function formatMovementOperationLabel(movement: KardexMovement) {
  if (movement.reference_type === "transfer") {
    return movement.movement_type === "OUT" ? "Transferencia enviada" : "Transferencia recibida";
  }

  if (movement.reference_type === "adjustment" || movement.movement_type === "ADJUST") {
    return "Ajuste";
  }

  return formatMovementTypeLabel(movement.movement_type);
}

function formatReference(movement: KardexMovement) {
  if (movement.reference_type && movement.reference_id) {
    const referenceLabel =
      movement.reference_type === "transfer"
        ? "Transferencia"
        : movement.reference_type === "adjustment"
          ? "Ajuste"
          : movement.reference_type;
    return `${referenceLabel} ${movement.reference_id.slice(0, 8)}`;
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

export default function KardexPage() {
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [movementType, setMovementType] = useState<MovementOperationFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
        throw new Error(payload.message || "No se pudo cargar movimientos de stock");
      }
      setMovements(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar movimientos de stock"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadKardex());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("query");
    const initialLocation = params.get("location");

    if (initialQuery) {
      setQuery(initialQuery);
    }

    if (initialLocation) {
      setLocationFilter(initialLocation);
    }
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const movement of movements) {
      map.set(movement.location_code, movement.location_name);
    }

    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const movementDate = new Date(movement.created_at);
      const matchesType =
        movementType === "ALL" ||
        (movementType === "TRANSFER"
          ? movement.reference_type === "transfer"
          : movement.movement_type === movementType && movement.reference_type !== "transfer");
      const matchesLocation =
        locationFilter === "ALL" || movement.location_code === locationFilter;
      const matchesDateFrom =
        !dateFrom ||
        (!Number.isNaN(movementDate.getTime()) &&
          movementDate >= new Date(`${dateFrom}T00:00:00`));
      const matchesDateTo =
        !dateTo ||
        (!Number.isNaN(movementDate.getTime()) &&
          movementDate <= new Date(`${dateTo}T23:59:59`));
      const reference = formatReference(movement).toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        movement.sku.toLowerCase().includes(normalizedQuery) ||
        movement.style_name.toLowerCase().includes(normalizedQuery) ||
        movement.style_code.toLowerCase().includes(normalizedQuery) ||
        movement.location_name.toLowerCase().includes(normalizedQuery) ||
        (movement.reference_id || "").toLowerCase().includes(normalizedQuery) ||
        reference.includes(normalizedQuery);
      return matchesType && matchesLocation && matchesDateFrom && matchesDateTo && matchesQuery;
    });
  }, [dateFrom, dateTo, locationFilter, movements, query, movementType]);

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
        if (movement.reference_type === "transfer") {
          acc.transfers += 1;
        }
        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0, transfers: 0 }
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

  const hasActiveFilters =
    query !== "" ||
    locationFilter !== "ALL" ||
    movementType !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Trazabilidad"
          title="Movimientos de stock"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => loadKardex()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Actualizar
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <OpsMetricPill label="Entradas" value={totals.entries} tone="accent" />
          <OpsMetricPill label="Salidas" value={totals.exits} tone="warning" />
          <OpsMetricPill label="Ajustes" value={totals.adjustments} />
          <OpsMetricPill label="Transferencias" value={totals.transfers} />
        </div>

        <OpsSectionDivider>
          <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.45fr)_0.78fr_0.78fr_0.72fr_0.72fr_auto]">
            <OpsSearchField
              value={query}
              onChange={(value) => handleFilterChange(() => setQuery(value))}
              placeholder="Buscar por SKU, producto, ubicación o referencia"
              ariaLabel="Buscar movimientos de stock"
            />

            <FilterDropdown
              label="Sede"
              value={locationFilter}
              options={[
                { value: "ALL", label: "Todas" },
                ...locationOptions.map((location) => ({
                  value: location.code,
                  label: `${location.code} - ${location.name}`,
                })),
              ]}
              onChange={(value) => handleFilterChange(() => setLocationFilter(value))}
            />

            <FilterDropdown
              label="Tipo"
              value={movementType}
              options={[
                { value: "ALL", label: "Todos" },
                { value: "IN", label: "Entradas" },
                { value: "OUT", label: "Salidas" },
                { value: "ADJUST", label: "Ajustes" },
                { value: "TRANSFER", label: "Transferencias" },
              ]}
              onChange={(v) => handleFilterChange(() => setMovementType(v as MovementOperationFilter))}
            />

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => handleFilterChange(() => setDateFrom(event.target.value))}
                className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => handleFilterChange(() => setDateTo(event.target.value))}
                className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)]"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleFilterChange(() => {
                      setQuery("");
                      setLocationFilter("ALL");
                      setMovementType("ALL");
                      setDateFrom("");
                      setDateTo("");
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
          </OpsFiltersRow>

          <OpsTableWrap minWidth="1080px">
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
                        Cargando movimientos...
                      </td>
                    </tr>
                   ) : error ? (
                     <tr>
                       <td colSpan={8} className="px-4 py-6">
                         <InlineStatusCard
                           title="No pudimos cargar movimientos"
                           description={error}
                           tone="danger"
                           variant="ops"
                         />
                       </td>
                     </tr>
                   ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        {movements.length === 0
                          ? "No hay movimientos de stock registrados."
                          : "No se encontraron movimientos con los filtros actuales."}
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
                            {formatMovementOperationLabel(movement)}
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
          </OpsTableWrap>

          <OpsTableFooter>
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
          </OpsTableFooter>
          </OpsTableBlock>
        </OpsSectionDivider>
    </OpsPageShell>
  );
}
