"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  PackagePlus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetchData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useApiGet } from "@/hooks/use-api-get";
import { appRoutes, buildAdjustmentDetailRoute } from "@/lib/routes";
import {
  type AdjustmentListData,
  type AdjustmentStatus,
  formatAdjustmentIntent,
  formatAdjustmentDateTime,
  formatAdjustmentStatus,
  getAdjustmentStatusClasses,
  type Location,
  resolveAdjustmentIntent,
} from "./inventory-adjustments-shared";
import { ADJ } from "./adjustments-messages";
import {
  CHIP_INTENT_OPENING,
  CHIP_INTENT_ADJUSTMENT,
} from "./adjustments-constants";

function AdjustmentStatusChip({ status }: { status: AdjustmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        getAdjustmentStatusClasses(status)
      )}
    >
      {formatAdjustmentStatus(status)}
    </span>
  );
}

function AdjustmentIntentChip({
  adjustment,
}: {
  adjustment: { intent_type?: "opening" | "adjustment" | null; reason: string | null };
}) {
  const intent = resolveAdjustmentIntent(adjustment);
  const classes =
    intent === "opening" ? CHIP_INTENT_OPENING : CHIP_INTENT_ADJUSTMENT;

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        classes
      )}
    >
      {formatAdjustmentIntent(intent)}
    </span>
  );
}

export function InventoryAdjustmentsPage() {
  const { user, defaultLocation } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = appRoutes.inventoryAdjustments;

  const urlQuery = searchParams.get("query") || "";
  const urlLocationId = searchParams.get("location_id") || null;
  const urlStatus = searchParams.get("status") || null;

  const [query, setQuery] = useState(urlQuery);
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>(
    (urlStatus === "draft" || urlStatus === "confirmed" || urlStatus === "cancelled")
      ? urlStatus
      : "all"
  );
  const [locationFilter, setLocationFilter] = useState(urlLocationId || "all");

  const canManageAdjustments = ["ADMIN", "ALMACEN"].includes(
    String(user?.role_name || "").toUpperCase()
  );

  const {
    data: adjustmentData,
    loading: loadingAdjustments,
    error,
    refetch: refreshAdjustments,
  } = useApiGet(
    () =>
      apiFetchData<AdjustmentListData>("/api/inventory/adjustments", {
        cache: "no-store",
      }),
    []
  );

  const adjustments = adjustmentData?.rows || [];
  const locations: Location[] = adjustmentData?.meta?.available_locations || [];

  // ── Auto-scope to default location ──
  const locationAutoSet = useRef(false);

  useEffect(() => {
    if (locationAutoSet.current || loadingAdjustments || !locations.length) return;
    if (urlLocationId) return;

    const defaultLoc = locations.find((l) => l.is_default) ?? locations[0];
    if (defaultLoc) {
      locationAutoSet.current = true;
      let cancelled = false;
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setLocationFilter(defaultLoc.location_id);
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [loadingAdjustments, locations, urlLocationId]);

  const effectiveLocationFilter =
    locationFilter === "all" ||
    locations.some((loc) => loc.location_id === locationFilter)
      ? locationFilter
      : "all";

  const filteredAdjustments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adjustments.filter((adj) => {
      const matchesStatus =
        statusFilter === "all" || adj.status === statusFilter;
      const matchesLocation =
        effectiveLocationFilter === "all" ||
        adj.location_id === effectiveLocationFilter;
      const matchesQuery =
        !normalizedQuery ||
        adj.adjustment_number.toLowerCase().includes(normalizedQuery) ||
        adj.location_code.toLowerCase().includes(normalizedQuery) ||
        adj.location_name.toLowerCase().includes(normalizedQuery) ||
        (adj.reason || "").toLowerCase().includes(normalizedQuery) ||
        (adj.created_by_name || "").toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesLocation && matchesQuery;
    });
  }, [adjustments, effectiveLocationFilter, query, statusFilter]);

  const totals = useMemo(
    () => ({
      total: adjustments.length,
      drafts: adjustments.filter((a) => a.status === "draft").length,
      confirmed: adjustments.filter((a) => a.status === "confirmed").length,
    }),
    [adjustments]
  );

  const {
    paginatedItems: paginatedAdjustments,
    firstVisible,
    lastVisible,
    totalPages,
    safePage,
    setPage,
  } = usePagination(filteredAdjustments);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    statusFilter !== "all" ||
    locationFilter !== "all";

  // ── Location badge text ──
  const locationBadgeText = useMemo(() => {
    if (loadingAdjustments) return ADJ.locationBadge.loading;
    if (!locations.length) return ADJ.locationBadge.noLocation;
    if (effectiveLocationFilter === "all") return ADJ.locationBadge.allLocations;
    const loc = locations.find((l) => l.location_id === effectiveLocationFilter);
    return loc?.name ?? defaultLocation?.name ?? ADJ.locationBadge.noLocation;
  }, [loadingAdjustments, locations, effectiveLocationFilter, defaultLocation]);

  // ── URL-sync ──
  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (effectiveLocationFilter !== "all") p.set("location_id", effectiveLocationFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    const nextUrl = p.toString() ? `${pathname}?${p.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [query, effectiveLocationFilter, statusFilter, pathname, router]);

  // ── Reset filters to default location ──
  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
    const defaultLoc = locations.find((l) => l.is_default) ?? locations[0];
    setLocationFilter(defaultLoc?.location_id ?? "all");
  }

  return (
    <>
      {!canManageAdjustments ? (
        <ForbiddenPage variant="ops" />
      ) : (
        <OpsPageShell width="wide">
          <PosHeader
            eyebrow={ADJ.header.eyebrow}
            title={ADJ.header.title}
            meta={
              <OpsStatusBadge tone="neutral" size="sm" icon={<MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />}>
                {locationBadgeText}
              </OpsStatusBadge>
            }
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void refreshAdjustments()}
                >
                  <RefreshCw className="h-4 w-4" />
                  {ADJ.header.update}
                </Button>
                <Button
                  asChild
                  variant="accent"
                  size="sm"
                  className="rounded-lg"
                >
                  <Link href={`${appRoutes.inventoryAdjustments}/nuevo`}>
                    <PackagePlus className="h-4 w-4" />
                    {ADJ.header.createTitle}
                  </Link>
                </Button>
              </div>
            }
          />

          <OpsMetricInlineGroup
            items={[
              { label: ADJ.metrics.total, value: totals.total },
              { label: ADJ.metrics.drafts, value: totals.drafts, tone: "warning" },
              {
                label: ADJ.metrics.confirmed,
                value: totals.confirmed,
                tone: "accent",
              },
            ]}
          />

          <OpsSectionDivider>
            <OpsTableBlock>
              <OpsFiltersRow className="lg:grid-cols-[1.4fr_0.9fr_0.8fr_auto]">
                <OpsSearchField
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder={ADJ.filters.searchPlaceholder}
                  ariaLabel={ADJ.filters.searchAriaLabel}
                />

                <OpsSelect
                  label={ADJ.filters.locationLabel}
                  value={effectiveLocationFilter}
                  options={[
                    { value: "all", label: ADJ.filters.allLocations },
                    ...locations.map((loc) => ({
                      value: loc.location_id,
                      label: `${loc.code} - ${loc.name}`,
                    })),
                  ]}
                  onChange={(value) => {
                    setLocationFilter(value);
                    setPage(1);
                  }}
                />

                <OpsSelect
                  label={ADJ.filters.statusLabel}
                  value={statusFilter}
                  options={[
                    { value: "all", label: ADJ.filters.allStatuses },
                    { value: "draft", label: ADJ.status.draft },
                    { value: "confirmed", label: ADJ.status.confirmed },
                    { value: "cancelled", label: ADJ.status.cancelled },
                  ]}
                  onChange={(value) => {
                    setStatusFilter(value as "all" | AdjustmentStatus);
                    setPage(1);
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 self-start rounded-lg lg:self-end"
                      onClick={resetFilters}
                      disabled={!hasActiveFilters}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{ADJ.filters.clear}</TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsDataTable
                columns={[
                  { key: "number", header: ADJ.table.columns.number },
                  { key: "location", header: ADJ.table.columns.location },
                  { key: "status", header: ADJ.table.columns.status },
                  { key: "intent", header: ADJ.table.columns.intent },
                  { key: "reason", header: ADJ.table.columns.reason },
                  { key: "lines", header: ADJ.table.columns.lines, className: "text-right" },
                  { key: "created", header: ADJ.table.columns.created },
                  { key: "actions", header: ADJ.table.columns.actions, className: "text-right" },
                ]}
                minWidth="980px"
                loading={loadingAdjustments}
                loadingMessage={ADJ.table.loading}
                error={error}
                errorTitle={ADJ.table.loadErrorTitle}
                isEmpty={paginatedAdjustments.length === 0}
                emptyMessage={ADJ.table.empty}
                footer={
                  <>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {filteredAdjustments.length
                        ? ADJ.table.results(
                            firstVisible,
                            lastVisible,
                            filteredAdjustments.length
                          )
                        : ADJ.table.zeroResults}
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
                {paginatedAdjustments.map((adj) => (
                  <tr
                    key={adj.adjustment_id}
                    className="transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <span className="text-sm font-semibold text-[var(--ops-text)]">
                        {adj.adjustment_number}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <div className="text-sm text-[var(--ops-text)]">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                          {adj.location_name}
                        </span>
                        <p className="text-[11px] text-[var(--ops-text-muted)]">
                          {adj.location_code}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <AdjustmentStatusChip status={adj.status} />
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <AdjustmentIntentChip adjustment={adj} />
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <span className="block max-w-[180px] truncate text-sm text-[var(--ops-text)]">
                        {adj.reason || ADJ.list.emptyReason}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm font-semibold text-[var(--ops-text)]">
                      {adj.line_count}
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                      <div className="text-sm text-[var(--ops-text)]">
                        {formatAdjustmentDateTime(adj.created_at)}
                        <p className="text-[11px] text-[var(--ops-text-muted)]">
                          {adj.created_by_name || ADJ.list.systemUser}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg px-3"
                      >
                        <Link
                          href={buildAdjustmentDetailRoute(
                            adj.adjustment_id
                          )}
                          aria-label={ADJ.table.actions.viewDetailAria(
                            adj.adjustment_number
                          )}
                        >
                          {ADJ.table.actions.viewDetail}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            </OpsTableBlock>
          </OpsSectionDivider>
        </OpsPageShell>
      )}
    </>
  );
}
