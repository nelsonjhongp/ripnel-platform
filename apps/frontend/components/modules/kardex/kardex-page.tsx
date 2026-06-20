"use client";

import { useEffect, useMemo, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  RotateCcw,
  Download,
} from "lucide-react";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/shared";
import { formatDateTime } from "@/lib/date-utils";
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
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { KardexMovement, KardexResponse, MovementOperationFilter, MovementOriginFilter } from "@/lib/kardex-domain";
import { resolveDocumentFamily, resolveMovementDirection, resolveSemanticOrigin, formatMovementOperationLabel, formatMovementOriginLabel, formatReference, resolveMovementTypeFromParams, resolveOriginFilterFromParams, resolveBackendReferenceType } from "@/lib/kardex-domain";
import { exportToCsv } from "@/lib/export-csv";

export default function KardexPage() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const initialQuery = searchParams.get("query") ?? searchParams.get("reference_id") ?? "";
  const initialLocation = searchParams.get("location_id") ?? searchParams.get("location") ?? "ALL";
  const initialMovementType = resolveMovementTypeFromParams(
    searchParams.get("movement_type"),
    searchParams.get("reference_type")
  );
  const initialOriginFilter = resolveOriginFilterFromParams(searchParams.get("reference_type"));
  const initialDateFrom = searchParams.get("date_from") ?? "";
  const initialDateTo = searchParams.get("date_to") ?? "";

  return (
    <KardexPageContent
      key={searchParamsKey}
      initialQuery={initialQuery}
      initialLocation={initialLocation}
      initialMovementType={initialMovementType}
      initialOriginFilter={initialOriginFilter}
      initialDateFrom={initialDateFrom}
      initialDateTo={initialDateTo}
      referenceTypeParam={searchParams.get("reference_type")}
      referenceIdParam={searchParams.get("reference_id")}
      hasSearchContext={Boolean(searchParamsKey)}
    />
  );
}

function KardexPageContent({
  initialQuery,
  initialLocation,
  initialMovementType,
  initialOriginFilter,
  initialDateFrom,
  initialDateTo,
  referenceTypeParam,
  referenceIdParam,
  hasSearchContext,
}: {
  initialQuery: string;
  initialLocation: string;
  initialMovementType: MovementOperationFilter;
  initialOriginFilter: MovementOriginFilter;
  initialDateFrom: string;
  initialDateTo: string;
  referenceTypeParam: string | null;
  referenceIdParam: string | null;
  hasSearchContext: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [movementType, setMovementType] = useState<MovementOperationFilter>(initialMovementType);
  const [originFilter, setOriginFilter] = useState<MovementOriginFilter>(initialOriginFilter);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const { data: kardexResponse, loading, error, refetch } = useApiGet<KardexResponse>(
    () => {
      const params = new URLSearchParams();
      const normalizedQuery = query.trim();
      const backendReferenceType = resolveBackendReferenceType(
        movementType,
        originFilter,
        referenceTypeParam
      );
      const combinedQuery = [normalizedQuery, referenceIdParam || ""]
        .map((value) => value.trim())
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .join(" ");

      if (movementType !== "ALL" && movementType !== "TRANSFER") {
        params.set("movement_type", movementType);
      }

      if (backendReferenceType) {
        params.set("reference_type", backendReferenceType);
      }

      if (referenceIdParam) {
        params.set("reference_id", referenceIdParam);
      }

      if (normalizedQuery) {
        params.set("query", combinedQuery);
      }

      if (locationFilter !== "ALL") {
        params.set("location_id", locationFilter);
      }

      if (dateFrom) {
        params.set("date_from", `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        params.set("date_to", `${dateTo}T23:59:59`);
      }

      return apiFetchData<KardexResponse>(`/api/inventory/kardex?${params.toString()}`, {
        cache: "no-store",
      });
    },
    [query, locationFilter, movementType, originFilter, referenceTypeParam, referenceIdParam, dateFrom, dateTo]
  );

  const movements = useMemo(() => kardexResponse?.rows || [], [kardexResponse]);
  const availableLocations = useMemo(() => kardexResponse?.meta?.available_locations || [], [kardexResponse]);

  const effectiveLocationFilter =
    locationFilter === "ALL" ||
    availableLocations.some((location) => location.location_id === locationFilter)
      ? locationFilter
      : "ALL";

  const locationOptions = useMemo(() => {
    return availableLocations.map((location) => ({
      location_id: location.location_id,
      code: location.code,
      name: location.name,
    }));
  }, [availableLocations]);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const movementDate = new Date(movement.created_at);
      const movementDirection = resolveMovementDirection(movement);
      const documentFamily = resolveDocumentFamily(movement);
      const semanticOrigin = resolveSemanticOrigin(movement);
      const matchesType =
        movementType === "ALL" ||
        (movementType === "TRANSFER"
          ? documentFamily === "transfer"
          : movementType === "IN"
            ? movementDirection === "entry" && documentFamily !== "transfer"
            : movementType === "OUT"
              ? movementDirection === "exit" && documentFamily !== "transfer"
              : movementDirection === "adjustment");
      const matchesOrigin =
        originFilter === "ALL" ||
        (originFilter === "opening"
          ? semanticOrigin === "opening_confirmed"
          : originFilter === "adjustment"
            ? semanticOrigin === "adjustment_confirmed"
            : documentFamily === originFilter);
      const matchesLocation =
        effectiveLocationFilter === "ALL" || movement.location_id === effectiveLocationFilter;
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
      return (
        matchesType &&
        matchesOrigin &&
        matchesLocation &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesQuery
      );
    });
  }, [dateFrom, dateTo, effectiveLocationFilter, movements, originFilter, query, movementType]);

  const totals = useMemo(() => {
    return filteredMovements.reduce(
      (acc, movement) => {
        if (movement.quantity_effect > 0) {
          acc.entries += movement.quantity_effect;
        }
        if (movement.quantity_effect < 0) {
          acc.exits += Math.abs(movement.quantity_effect);
        }
        if (resolveMovementDirection(movement) === "adjustment") {
          acc.adjustments += 1;
        }
        if (resolveDocumentFamily(movement) === "transfer") {
          acc.transfers += 1;
        }
        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0, transfers: 0 }
    );
  }, [filteredMovements]);

  const {
    paginatedItems: paginatedMovements,
    firstVisible,
    lastVisible,
    totalPages,
    safePage,
    setPage,
  } = usePagination(filteredMovements);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const hasActiveFilters =
    query !== "" ||
    effectiveLocationFilter !== "ALL" ||
    movementType !== "ALL" ||
    originFilter !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    hasSearchContext;

  function handleExport() {
    const headers = ["SKU", "Producto", "Sede", "Tipo", "Cantidad", "Efecto", "Saldo", "Origen", "Referencia", "Usuario", "Fecha"]
    const rows = filteredMovements.map((m) => [
      m.sku,
      `${m.style_name} (${m.style_code})`,
      m.location_name,
      formatMovementOperationLabel(m),
      String(m.quantity),
      String(m.quantity_effect),
      String(m.balance_qty),
      formatMovementOriginLabel(m),
      formatReference(m),
      m.created_by_name || "-",
      formatDateTime(m.created_at),
    ])
    exportToCsv("kardex", headers, rows)
  }

  return (
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Kardex"
          title="Movimientos de stock"
          actions={
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={handleExport}
                    disabled={filteredMovements.length === 0}
                    aria-label="Exportar CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Exportar CSV
                </TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Actualizar
              </Button>
            </div>
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
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.45fr)_0.75fr_0.75fr_0.75fr_0.72fr_0.72fr_auto]">
            <OpsSearchField
              value={query}
              onChange={(value) => handleFilterChange(() => setQuery(value))}
              placeholder="Buscar por SKU, producto, sede, origen o referencia"
              ariaLabel="Buscar movimientos de stock"
            />

            <FilterDropdown
              label="Sede"
              value={effectiveLocationFilter}
              options={[
                { value: "ALL", label: "Todas" },
                ...locationOptions.map((location) => ({
                  value: location.location_id,
                  label: `${location.code} - ${location.name}`,
                })),
              ]}
              onChange={(value) => handleFilterChange(() => setLocationFilter(value))}
            />

            <FilterDropdown
              label="Operación"
              value={movementType}
              options={[
                { value: "ALL", label: "Todos" },
                { value: "IN", label: "Entradas" },
                { value: "OUT", label: "Salidas" },
                { value: "ADJUST", label: "Ajustes" },
                { value: "TRANSFER", label: "Por transferencia" },
              ]}
              onChange={(v) => handleFilterChange(() => setMovementType(v as MovementOperationFilter))}
            />

            <FilterDropdown
              label="Origen"
              value={originFilter}
              options={[
                { value: "ALL", label: "Todos" },
                { value: "sale", label: "Venta" },
                { value: "transfer", label: "Transferencia" },
                { value: "exchange", label: "Cambio" },
                { value: "adjustment", label: "Ajuste" },
                { value: "opening", label: "Apertura" },
              ]}
              onChange={(v) => handleFilterChange(() => setOriginFilter(v as MovementOriginFilter))}
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
                      setOriginFilter("ALL");
                      setDateFrom("");
                      setDateTo("");
                      if (hasSearchContext) {
                        router.replace(pathname);
                      }
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

          <OpsDataTable
            columns={[
              { key: "fecha", header: "Fecha" },
              { key: "sku", header: "SKU" },
              { key: "producto", header: "Producto" },
              { key: "origen", header: "Origen", className: "hidden sm:table-cell" },
              { key: "ref", header: "Ref.", className: "hidden xl:table-cell" },
              { key: "tipo", header: "Tipo" },
              { key: "cantidad", header: "Cantidad", className: "text-right" },
              { key: "ubicacion", header: "Ubicación" },
              { key: "usuario", header: "Usuario" },
            ]}
            minWidth="1080px"
            loading={loading}
            loadingMessage="Cargando movimientos..."
            error={error}
            errorTitle="No pudimos cargar movimientos"
            emptyMessage={movements.length === 0 ? "No hay movimientos de stock registrados." : "No se encontraron movimientos con los filtros actuales."}
            isEmpty={!loading && !error && filteredMovements.length === 0}
            footer={
              <>
                <span className="text-[var(--ops-text-muted)]">
                  {filteredMovements.length === 0
                    ? "0 resultados"
                    : `${firstVisible}-${lastVisible} de ${filteredMovements.length}`}
                </span>
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className="self-end md:self-auto"
                />
              </>
            }
          >
            {paginatedMovements.map((movement) => (
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
                    {formatMovementOriginLabel(movement)}
                </td>
                <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)] hidden xl:table-cell">
                    {formatReference(movement)}
                </td>
                <td className="px-4 py-[var(--ops-row-py)]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      resolveMovementDirection(movement) === "entry" &&
                        "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]",
                      resolveMovementDirection(movement) === "exit" &&
                        "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]",
                      resolveMovementDirection(movement) === "adjustment" &&
                        "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text-muted)]"
                    )}
                  >
                    {resolveMovementDirection(movement) === "entry" && (
                      <ArrowUpCircle className="h-3 w-3" />
                    )}
                    {resolveMovementDirection(movement) === "exit" && (
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
            ))}
          </OpsDataTable>
          </OpsTableBlock>
        </OpsSectionDivider>
    </OpsPageShell>
  );
}
