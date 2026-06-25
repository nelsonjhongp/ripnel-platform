"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePagination } from "@/hooks/use-pagination";
import Link from "next/link";
import {
  Eye,
  LoaderCircle,
  MapPin,
  PackagePlus,
  PencilLine,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetchData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useApiGet } from "@/hooks/use-api-get";
import { appRoutes, buildAdjustmentDetailRoute } from "@/lib/routes";
import {
  type AdjustmentListData,
  type AdjustmentStatus,
  type AdjustmentSummary,
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
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>("all");
  const [locationFilter, setLocationFilter] = useState("all");

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
    effectiveLocationFilter !== "all";

  return (
    <TooltipProvider delayDuration={120}>
      {!canManageAdjustments ? (
        <ForbiddenPage variant="ops" />
      ) : (
        <OpsPageShell width="wide">
          <PosHeader
            eyebrow={ADJ.header.eyebrow}
            title={ADJ.header.title}
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
                  ariaLabel="Buscar ajustes de inventario"
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
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("all");
                        setLocationFilter("all");
                        setPage(1);
                      }}
                      disabled={!hasActiveFilters}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{ADJ.filters.clear}</TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsTableWrap minWidth="980px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">{ADJ.table.columns.number}</th>
                      <th className="px-4 py-3">{ADJ.table.columns.location}</th>
                      <th className="px-4 py-3">{ADJ.table.columns.status}</th>
                      <th className="px-4 py-3">{ADJ.table.columns.intent}</th>
                      <th className="px-4 py-3">{ADJ.table.columns.reason}</th>
                      <th className="px-4 py-3 text-right">
                        {ADJ.table.columns.lines}
                      </th>
                      <th className="px-4 py-3">{ADJ.table.columns.created}</th>
                      <th className="px-4 py-3 text-right">
                        {ADJ.table.columns.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loadingAdjustments ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin align-middle" />
                          {ADJ.table.loading}
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6">
                          <InlineStatusCard
                            title={ADJ.table.loadErrorTitle}
                            description={error}
                            tone="danger"
                            variant="ops"
                          />
                        </td>
                      </tr>
                    ) : paginatedAdjustments.length ? (
                      paginatedAdjustments.map((adj) => (
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={buildAdjustmentDetailRoute(
                                    adj.adjustment_id
                                  )}
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="rounded-lg"
                                    aria-label={ADJ.table.actions.viewDetailAria(
                                      adj.adjustment_number
                                    )}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                {ADJ.table.actions.viewDetail}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-10">
                          <OpsEmptyState
                            variant="compact"
                            description={ADJ.table.empty}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>

              <OpsTableFooter>
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
              </OpsTableFooter>
            </OpsTableBlock>
          </OpsSectionDivider>
        </OpsPageShell>
      )}
    </TooltipProvider>
  );
}
