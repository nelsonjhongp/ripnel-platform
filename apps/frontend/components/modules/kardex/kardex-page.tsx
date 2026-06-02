"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { apiFetchData } from "@/lib/api";
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
type MovementDirection = "entry" | "exit" | "adjustment";
type DocumentFamily = "sale" | "transfer" | "exchange" | "adjustment" | "none";
type SemanticOrigin =
  | "sale_confirmed"
  | "sale_cancelled"
  | "transfer_shipped"
  | "transfer_received"
  | "exchange_received"
  | "exchange_delivered"
  | "opening_confirmed"
  | "adjustment_confirmed"
  | "unclassified";
type MovementOperationFilter = "ALL" | "IN" | "OUT" | "ADJUST" | "TRANSFER";
type MovementOriginFilter =
  | "ALL"
  | "sale"
  | "transfer"
  | "exchange"
  | "adjustment"
  | "opening";

type KardexLocation = {
  location_id: string;
  code: string;
  name: string;
  type?: string | null;
  active?: boolean;
  is_default?: boolean;
};

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
  movement_direction?: MovementDirection | null;
  document_family?: DocumentFamily | null;
  semantic_origin?: SemanticOrigin | null;
};

type KardexResponse = {
  rows: KardexMovement[];
  meta: {
    available_locations: KardexLocation[];
    selected_location_id: string | null;
    can_view_all_locations: boolean;
  };
};

function isOpeningMovement(movement: KardexMovement) {
  return (
    movement.reference_type === "adjustment" &&
    /apertura|inicial/i.test(movement.reason || "")
  );
}

function resolveDocumentFamily(movement: KardexMovement): DocumentFamily {
  if (
    movement.document_family === "sale" ||
    movement.document_family === "transfer" ||
    movement.document_family === "exchange" ||
    movement.document_family === "adjustment" ||
    movement.document_family === "none"
  ) {
    return movement.document_family;
  }

  if (movement.reference_type === "sale") return "sale";
  if (movement.reference_type === "transfer") return "transfer";
  if (movement.reference_type === "exchange") return "exchange";
  if (movement.reference_type === "adjustment" || movement.movement_type === "ADJUST") {
    return "adjustment";
  }

  return "none";
}

function resolveMovementDirection(movement: KardexMovement): MovementDirection {
  if (
    movement.movement_direction === "entry" ||
    movement.movement_direction === "exit" ||
    movement.movement_direction === "adjustment"
  ) {
    return movement.movement_direction;
  }

  if (movement.movement_type === "IN") return "entry";
  if (movement.movement_type === "OUT") return "exit";
  return "adjustment";
}

function resolveSemanticOrigin(movement: KardexMovement): SemanticOrigin {
  if (
    movement.semantic_origin === "sale_confirmed" ||
    movement.semantic_origin === "sale_cancelled" ||
    movement.semantic_origin === "transfer_shipped" ||
    movement.semantic_origin === "transfer_received" ||
    movement.semantic_origin === "exchange_received" ||
    movement.semantic_origin === "exchange_delivered" ||
    movement.semantic_origin === "opening_confirmed" ||
    movement.semantic_origin === "adjustment_confirmed" ||
    movement.semantic_origin === "unclassified"
  ) {
    return movement.semantic_origin;
  }

  const documentFamily = resolveDocumentFamily(movement);
  const movementDirection = resolveMovementDirection(movement);

  if (documentFamily === "transfer") {
    return movementDirection === "exit" ? "transfer_shipped" : "transfer_received";
  }

  if (documentFamily === "sale") {
    return movementDirection === "entry" ? "sale_cancelled" : "sale_confirmed";
  }

  if (documentFamily === "exchange") {
    return movementDirection === "entry" ? "exchange_received" : "exchange_delivered";
  }

  if (documentFamily === "adjustment") {
    return isOpeningMovement(movement) ? "opening_confirmed" : "adjustment_confirmed";
  }

  return "unclassified";
}

function formatMovementOperationLabel(movement: KardexMovement) {
  switch (resolveSemanticOrigin(movement)) {
    case "transfer_shipped":
      return "Salida por transferencia";
    case "transfer_received":
      return "Entrada por transferencia";
    case "sale_confirmed":
      return "Salida por venta";
    case "sale_cancelled":
      return "Entrada por anulacion";
    case "exchange_received":
      return "Entrada por cambio";
    case "exchange_delivered":
      return "Salida por cambio";
    case "opening_confirmed":
      return "Apertura inicial";
    case "adjustment_confirmed":
      return "Ajuste";
    default:
      if (resolveMovementDirection(movement) === "entry") return "Entrada";
      if (resolveMovementDirection(movement) === "exit") return "Salida";
      return "Ajuste";
  }
}

function formatMovementOriginLabel(movement: KardexMovement) {
  switch (resolveSemanticOrigin(movement)) {
    case "transfer_shipped":
      return "Transferencia despachada";
    case "transfer_received":
      return "Transferencia recibida";
    case "sale_confirmed":
      return "Venta confirmada";
    case "sale_cancelled":
      return "Venta anulada";
    case "exchange_received":
      return "Cambio recibido";
    case "exchange_delivered":
      return "Cambio entregado";
    case "opening_confirmed":
      return "Apertura inicial";
    case "adjustment_confirmed":
      return "Ajuste de inventario";
    default:
      return "Movimiento sin documento";
  }
}

function formatReference(movement: KardexMovement) {
  if (movement.reference_type && movement.reference_id) {
    const referenceLabel =
      resolveDocumentFamily(movement) === "transfer"
        ? "Transferencia"
        : resolveDocumentFamily(movement) === "sale"
          ? "Venta"
          : resolveDocumentFamily(movement) === "exchange"
            ? "Postventa"
        : resolveDocumentFamily(movement) === "adjustment"
          ? resolveSemanticOrigin(movement) === "opening_confirmed"
            ? "Apertura"
            : "Ajuste"
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

function resolveMovementTypeFromParams(
  movementTypeParam: string | null,
  referenceTypeParam: string | null
): MovementOperationFilter {
  if (movementTypeParam === "IN" || movementTypeParam === "OUT" || movementTypeParam === "ADJUST") {
    return movementTypeParam;
  }

  if (referenceTypeParam === "transfer") {
    return "TRANSFER";
  }

  return "ALL";
}

function resolveOriginFilterFromParams(referenceTypeParam: string | null): MovementOriginFilter {
  if (
    referenceTypeParam === "sale" ||
    referenceTypeParam === "transfer" ||
    referenceTypeParam === "exchange" ||
    referenceTypeParam === "adjustment"
  ) {
    return referenceTypeParam;
  }

  return "ALL";
}

function resolveBackendReferenceType(
  movementType: MovementOperationFilter,
  originFilter: MovementOriginFilter,
  referenceTypeParam: string | null
) {
  if (
    referenceTypeParam === "sale" ||
    referenceTypeParam === "transfer" ||
    referenceTypeParam === "exchange" ||
    referenceTypeParam === "adjustment"
  ) {
    return referenceTypeParam;
  }

  if (
    originFilter === "sale" ||
    originFilter === "transfer" ||
    originFilter === "exchange" ||
    originFilter === "adjustment"
  ) {
    return originFilter;
  }

  if (movementType === "TRANSFER") {
    return "transfer";
  }

  return null;
}

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
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [availableLocations, setAvailableLocations] = useState<KardexLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [movementType, setMovementType] = useState<MovementOperationFilter>(initialMovementType);
  const [originFilter, setOriginFilter] = useState<MovementOriginFilter>(initialOriginFilter);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [currentPage, setCurrentPage] = useState(1);
  const effectiveLocationFilter =
    locationFilter === "ALL" ||
    availableLocations.some((location) => location.location_id === locationFilter)
      ? locationFilter
      : "ALL";

  const loadKardex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      if (effectiveLocationFilter !== "ALL") {
        params.set("location_id", effectiveLocationFilter);
      }

      if (dateFrom) {
        params.set("date_from", `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        params.set("date_to", `${dateTo}T23:59:59`);
      }

      const data = await apiFetchData<KardexResponse>(`/api/inventory/kardex?${params.toString()}`, {
        cache: "no-store",
      });
      setMovements(data?.rows || []);
      setAvailableLocations(data?.meta.available_locations || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar movimientos de stock"
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, effectiveLocationFilter, movementType, originFilter, query, referenceIdParam, referenceTypeParam]);

  useEffect(() => {
    void Promise.resolve().then(() => loadKardex());
  }, [loadKardex]);

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
    effectiveLocationFilter !== "ALL" ||
    movementType !== "ALL" ||
    originFilter !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    hasSearchContext;

  return (
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Kardex"
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

          <OpsTableWrap minWidth="1080px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Origen</th>
                    <th className="px-4 py-3 hidden xl:table-cell">Ref.</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        <LoaderCircle className="mr-2 inline-block h-4 w-4 animate-spin" />
                        Cargando movimientos...
                      </td>
                    </tr>
                   ) : error ? (
                     <tr>
                       <td colSpan={9} className="px-4 py-6">
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
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
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
