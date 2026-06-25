"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  MapPin,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
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

import type { KardexResponse, MovementOperationFilter, MovementOriginFilter } from "./kardex-domain";
import { resolveDocumentFamily, resolveMovementDirection, resolveSemanticOrigin, formatMovementOperationLabel, formatMovementOriginLabel, formatReference, resolveMovementTypeFromParams, resolveOriginFilterFromParams, resolveBackendReferenceType } from "./kardex-domain";
import { exportToCsv } from "@/lib/export-csv";
import { KARDEX } from "./kardex-messages";
import { CHIP_ENTRY, CHIP_EXIT, CHIP_ADJUST, QTY_POSITIVE, QTY_NEGATIVE } from "./kardex-constants";
import { DateFilterPicker } from "@/components/ui/date-filter-picker";

export default function KardexPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { defaultLocation, locationsLoading } = useAuth();

  const urlLocationId = searchParams.get("location_id") ?? searchParams.get("location");
  const referenceTypeParam = searchParams.get("reference_type");
  const referenceIdParam = searchParams.get("reference_id");
  const hasSearchContext = Boolean(searchParams.toString());

  const initialQuery = searchParams.get("query") ?? referenceIdParam ?? "";
  const initialMovementType = resolveMovementTypeFromParams(
    searchParams.get("movement_type"),
    referenceTypeParam
  );
  const initialOriginFilter = resolveOriginFilterFromParams(
    referenceTypeParam ?? searchParams.get("origin")
  );
  const initialDateFrom = searchParams.get("date_from") ?? "";
  const initialDateTo = searchParams.get("date_to") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [locationFilter, setLocationFilter] = useState(
    urlLocationId || defaultLocation?.location_id || "ALL"
  );
  const [movementType, setMovementType] = useState<MovementOperationFilter>(initialMovementType);
  const [originFilter, setOriginFilter] = useState<MovementOriginFilter>(initialOriginFilter);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const locationAutoSet = useRef(false);

  useEffect(() => {
    if (
      !locationAutoSet.current &&
      !urlLocationId &&
      !locationsLoading &&
      defaultLocation?.location_id
    ) {
      locationAutoSet.current = true;
      setLocationFilter(defaultLocation.location_id);
    }
  }, [locationsLoading, defaultLocation?.location_id, urlLocationId]);

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

  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (locationFilter !== "ALL") p.set("location_id", locationFilter);
    if (movementType !== "ALL") p.set("movement_type", movementType);
    if (originFilter !== "ALL") p.set("origin", originFilter);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    const nextUrl = p.toString() ? `${pathname}?${p.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [query, locationFilter, movementType, originFilter, dateFrom, dateTo, pathname, router]);

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

  const locationBadgeText = useMemo(() => {
    if (locationsLoading) return KARDEX.locationBadge.loading;
    if (!defaultLocation?.name) return KARDEX.locationBadge.noLocation;
    if (locationFilter === "ALL") return KARDEX.filters.locationAll;
    const loc = availableLocations.find((l) => l.location_id === locationFilter);
    return loc?.name || defaultLocation.name;
  }, [locationsLoading, defaultLocation, locationFilter, availableLocations]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const movementDate = new Date(movement.created_at);
      const direction = movement.movement_direction ?? resolveMovementDirection(movement);
      const family = movement.document_family ?? resolveDocumentFamily(movement);
      const semantic = movement.semantic_origin ?? resolveSemanticOrigin(movement);

      const matchesType =
        movementType === "ALL" ||
        (movementType === "TRANSFER"
          ? family === "transfer"
          : movementType === "IN"
            ? direction === "entry" && family !== "transfer"
            : movementType === "OUT"
              ? direction === "exit" && family !== "transfer"
              : direction === "adjustment");

      const matchesOrigin =
        originFilter === "ALL" ||
        (originFilter === "opening"
          ? semantic === "opening_confirmed"
          : originFilter === "adjustment"
            ? semantic === "adjustment_confirmed"
            : family === originFilter);

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
        const direction = movement.movement_direction ?? resolveMovementDirection(movement);
        const family = movement.document_family ?? resolveDocumentFamily(movement);

        if (direction === "entry" && family !== "transfer") acc.entries += 1;
        if (direction === "exit" && family !== "transfer") acc.exits += 1;
        if (direction === "adjustment") acc.adjustments += 1;
        if (family === "transfer") acc.transfers += 1;
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

  function resetFilters() {
    setQuery("");
    setLocationFilter(defaultLocation?.location_id || "ALL");
    setMovementType("ALL");
    setOriginFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    if (hasSearchContext) {
      router.replace(pathname);
    }
  }

  function handleExport() {
    const headers = [...KARDEX.csv.headers]
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
    exportToCsv(KARDEX.csv.filename, headers, rows)
  }

  return (
    <TooltipProvider delayDuration={120}>
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow={KARDEX.header.eyebrow}
          title={KARDEX.header.title}
          meta={
            <OpsStatusBadge
              tone="neutral"
              size="sm"
              icon={<MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />}
            >
              {locationBadgeText}
            </OpsStatusBadge>
          }
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
                    aria-label={KARDEX.actions.exportCsv}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {KARDEX.actions.exportCsv}
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
                {KARDEX.actions.refresh}
              </Button>
            </div>
          }
        />

        <OpsMetricInlineGroup
          items={[
            { label: KARDEX.metrics.entries, value: totals.entries, tone: "accent" },
            { label: KARDEX.metrics.exits, value: totals.exits, tone: "warning" },
            { label: KARDEX.metrics.adjustments, value: totals.adjustments, tone: "default" },
            { label: KARDEX.metrics.transfers, value: totals.transfers, tone: "default" },
          ]}
        />

        <OpsSectionDivider>
          <OpsTableBlock>
          <OpsFiltersRow
            className={cn(
              "lg:grid-cols-[minmax(0,1.25fr)_0.78fr_0.78fr_0.95fr_0.95fr_auto]",
              availableLocations.length > 1
                ? "lg:grid-cols-[minmax(0,1.15fr)_0.72fr_0.72fr_0.72fr_0.95fr_0.95fr_auto]"
                : ""
            )}
          >
            <OpsSearchField
              value={query}
              onChange={(value) => handleFilterChange(() => setQuery(value))}
              placeholder={KARDEX.filters.searchPlaceholder}
              ariaLabel={KARDEX.filters.searchAria}
            />

            {availableLocations.length > 1 && (
              <OpsSelect
                label={KARDEX.filters.location}
                value={effectiveLocationFilter}
                options={[
                  { value: "ALL", label: KARDEX.filters.locationAll },
                  ...locationOptions.map((location) => ({
                    value: location.location_id,
                    label: location.name,
                  })),
                ]}
                onChange={(value) => handleFilterChange(() => setLocationFilter(value))}
              />
            )}

            <OpsSelect
              label={KARDEX.filters.operation}
              value={movementType}
              options={[
                { value: "ALL", label: KARDEX.filters.operationAll },
                { value: "IN", label: KARDEX.filters.operationIn },
                { value: "OUT", label: KARDEX.filters.operationOut },
                { value: "ADJUST", label: KARDEX.filters.operationAdjust },
                { value: "TRANSFER", label: KARDEX.filters.operationTransfer },
              ]}
              onChange={(v) => handleFilterChange(() => setMovementType(v as MovementOperationFilter))}
            />

            <OpsSelect
              label={KARDEX.filters.origin}
              value={originFilter}
              options={[
                { value: "ALL", label: KARDEX.filters.originAll },
                { value: "sale", label: KARDEX.filters.originSale },
                { value: "transfer", label: KARDEX.filters.originTransfer },
                { value: "exchange", label: KARDEX.filters.originExchange },
                { value: "adjustment", label: KARDEX.filters.originAdjustment },
                { value: "opening", label: KARDEX.filters.originOpening },
              ]}
              onChange={(v) => handleFilterChange(() => setOriginFilter(v as MovementOriginFilter))}
            />

            <DateFilterPicker
              label={KARDEX.filters.dateFrom}
              value={dateFrom}
              onChange={(value) => handleFilterChange(() => setDateFrom(value))}
              max={dateTo || undefined}
              density="compact"
            />

            <DateFilterPicker
              label={KARDEX.filters.dateTo}
              value={dateTo}
              onChange={(value) => handleFilterChange(() => setDateTo(value))}
              min={dateFrom || undefined}
              max={todayStr}
              density="compact"
            />

            <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    className="rounded-lg"
                    aria-label={KARDEX.filters.clearAria}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{KARDEX.filters.clear}</TooltipContent>
              </Tooltip>
          </OpsFiltersRow>

          <OpsDataTable
            columns={[
              { key: "fecha", header: KARDEX.columns.date },
              { key: "sku", header: KARDEX.columns.sku },
              { key: "producto", header: KARDEX.columns.product },
              { key: "origen", header: KARDEX.columns.origin, className: "hidden sm:table-cell" },
              { key: "ref", header: KARDEX.columns.reference, className: "hidden xl:table-cell" },
              { key: "tipo", header: KARDEX.columns.type },
              { key: "cantidad", header: KARDEX.columns.quantity, className: "text-right" },
              { key: "ubicacion", header: KARDEX.columns.location },
              { key: "usuario", header: KARDEX.columns.user },
            ]}
            minWidth="1080px"
            loading={loading}
            loadingMessage={KARDEX.table.loading}
            error={error}
            errorTitle={KARDEX.table.errorTitle}
            isEmpty={filteredMovements.length === 0}
            emptyMessage={
              movements.length === 0
                ? KARDEX.table.emptyNoData
                : KARDEX.table.emptyNoResults
            }
            footer={
              <>
                <span className="text-[var(--ops-text-muted)]">
                  {filteredMovements.length === 0
                    ? KARDEX.table.footerZero
                    : KARDEX.table.footerSummary(firstVisible, lastVisible, filteredMovements.length)}
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
            {paginatedMovements.map((movement) => {
                      const dir = movement.movement_direction ?? resolveMovementDirection(movement);
                      return (
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
                              dir === "entry" && CHIP_ENTRY,
                              dir === "exit" && CHIP_EXIT,
                              dir === "adjustment" && CHIP_ADJUST
                            )}
                          >
                            {dir === "entry" && (
                              <ArrowUpCircle className="h-3 w-3" />
                            )}
                            {dir === "exit" && (
                              <ArrowDownCircle className="h-3 w-3" />
                            )}
                            {formatMovementOperationLabel(movement)}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                            movement.quantity_effect >= 0
                              ? QTY_POSITIVE
                              : QTY_NEGATIVE
                          )}
                        >
                          {movement.quantity_effect >= 0 ? "+" : ""}
                          {movement.quantity_effect}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                          {movement.location_name}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)]">
                          {movement.created_by_name || KARDEX.fallback.systemUser}
                        </td>
                      </tr>
                      );
            })}
          </OpsDataTable>
          </OpsTableBlock>
        </OpsSectionDivider>
    </OpsPageShell>
    </TooltipProvider>
  );
}
