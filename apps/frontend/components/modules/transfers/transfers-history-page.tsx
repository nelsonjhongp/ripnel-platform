"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, RotateCcw } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page";
import { apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { useTransferCapabilities } from "@/hooks/use-transfer-capabilities";
import { usePagination } from "@/hooks/use-pagination";
import { appRoutes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { DateFilterPicker } from "@/components/ui/date-filter-picker";
import { OpsSelect } from "@/components/ui/ops-selection";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatTransferScopeRole,
  formatTransferStatus,
  getTransferStatusClasses,
  TRANSFER_SCOPE_OPTIONS,
  type TransferScope,
  type TransferSummary,
} from "./transfers-shared";
import { formatDateTime } from "@/lib/date-utils";
import { TRANS } from "./transfers-messages";

type TransferHistoryStatus = "closed" | "received" | "cancelled";

const HISTORY_STATUS_OPTIONS: ReadonlyArray<{
  value: TransferHistoryStatus;
  label: string;
  helper: string;
}> = [
  {
    value: "closed",
    label: "Cerradas",
    helper: "Muestra transferencias recibidas o canceladas.",
  },
  {
    value: "received",
    label: TRANS.filters.historyStatusReceived,
    helper: TRANS.history.statusReceivedHelper,
  },
  {
    value: "cancelled",
    label: TRANS.filters.historyStatusCancelled,
    helper: TRANS.history.statusCancelledHelper,
  },
];

const todayStr = new Date().toISOString().slice(0, 10)
const defaultFrom = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
})()

export function TransfersHistoryPage() {
  const { loading: authLoading, permissions, user } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TransferHistoryStatus>("closed");
  const [scope, setScope] = useState<TransferScope>("current");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(todayStr);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const transferCapabilities = useTransferCapabilities();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const {
    data: itemsRaw,
    loading,
    error,
    refetch,
  } = useApiGet<TransferSummary[]>(
    () => {
      const params = new URLSearchParams({ scope, status });

      if (debouncedQuery.trim()) {
        params.set("query", debouncedQuery.trim());
      }

      params.set("date_from", dateFrom);
      params.set("date_to", dateTo);

      return apiFetch<ApiEnvelope<TransferSummary[]> | TransferSummary[]>(
        `/api/transfers?${params.toString()}`,
        { cache: "no-store" }
      ).then((payload) => unwrapApiData(payload) || []);
    },
    [debouncedQuery, scope, status, dateFrom, dateTo]
  );
  const items = itemsRaw ?? [];

  const receivedCount = useMemo(
    () => items.filter((transfer) => transfer.status === "received").length,
    [items]
  );
  const cancelledCount = useMemo(
    () => items.filter((transfer) => transfer.status === "cancelled").length,
    [items]
  );

  const {
    paginatedItems,
    firstVisible,
    lastVisible,
    totalPages,
    safePage,
    setPage: setCurrentPage,
  } = usePagination(items);
  const hasActiveFilters =
    Boolean(query.trim()) || status !== "closed" || scope !== "current" || dateFrom !== defaultFrom || dateTo !== todayStr;

  function clearFilters() {
    setQuery("");
    setDebouncedQuery("");
    setStatus("closed");
    setScope("current");
    setDateFrom(defaultFrom);
    setDateTo(todayStr);
    setCurrentPage(1);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title={TRANS.history.preparing}
        description={TRANS.history.loading}
      />
    );
  }

  if (!transferCapabilities.visible) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide" className="max-w-[1320px]">
      <PosHeader
        eyebrow={TRANS.header.eyebrow}
        title={TRANS.header.historyTitle}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={appRoutes.transfers}>{TRANS.history.backToInbox}</Link>
            </Button>
            {transferCapabilities.requestCreate ? (
              <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                <Link href={appRoutes.transferRequest}>
                  <Plus className="h-4 w-4" />
                  {TRANS.header.requestTitle}
                </Link>
              </Button>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => { setDebouncedQuery(query); refetch(); }}
                  disabled={loading}
                  className="rounded-lg"
                  aria-label={TRANS.header.refresh}
                >
                  {loading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{TRANS.header.refresh}</TooltipContent>
            </Tooltip>
          </>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: TRANS.metrics.received, value: receivedCount, tone: "accent" },
          { label: TRANS.filters.historyStatusCancelled, value: cancelledCount, tone: "default" },
          { label: TRANS.filters.historyDefaultOption, value: items.length, tone: "warning" },
        ]}
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.35fr)_0.9fr_0.9fr_0.86fr_0.86fr_auto]">
            <OpsSearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setCurrentPage(1);
              }}
              placeholder={TRANS.filters.searchPlaceholder}
              ariaLabel="Buscar transferencias cerradas"
            />

            <OpsSelect
              label={TRANS.filters.statusLabel}
              value={status}
              options={HISTORY_STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value as TransferHistoryStatus);
                setCurrentPage(1);
              }}
            />

            {transferCapabilities.manage ? (
              <OpsSelect
                label={TRANS.filters.scopeLabel}
                value={scope}
                options={TRANSFER_SCOPE_OPTIONS}
                onChange={(value) => {
                  setScope(value as TransferScope);
                  setCurrentPage(1);
                }}
              />
            ) : (
              <div className="flex items-end">
                <div className="sales-field flex h-10 w-full items-center rounded-lg px-3 text-sm text-[var(--ops-text-muted)]">
                  {TRANS.filters.locationLabel}
                </div>
              </div>
            )}

            <DateFilterPicker
              label={TRANS.filters.dateFromLabel}
              value={dateFrom}
              onChange={(value) => {
                setDateFrom(value);
                setCurrentPage(1);
              }}
              ariaLabel="Filtrar desde fecha"
              max={dateTo || undefined}
            />

            <DateFilterPicker
              label={TRANS.filters.dateToLabel}
              value={dateTo}
              onChange={(value) => {
                setDateTo(value);
                setCurrentPage(1);
              }}
              ariaLabel="Filtrar hasta fecha"
              min={dateFrom || undefined}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="rounded-lg"
                  aria-label={TRANS.header.clearFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{TRANS.header.clearFilters}</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          <OpsTableWrap minWidth="1120px">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">{TRANS.table.columns.number}</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">{TRANS.table.columns.status}</th>
                  <th className="px-4 py-3">Cierre</th>
                  <th className="px-4 py-3 text-right">{TRANS.table.columns.units}</th>
                  <th className="px-4 py-3">{TRANS.table.columns.lastUpdate}</th>
                  <th className="px-4 py-3 text-right">{TRANS.table.columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      {TRANS.table.loading}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <InlineStatusCard
                        title="No pudimos cargar el historial"
                        description={error}
                        tone="danger"
                        variant="ops"
                      />
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      {TRANS.table.emptyHistory}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((transfer) => {
                    const happenedAt =
                      transfer.received_at ||
                      transfer.cancelled_at ||
                      transfer.shipped_at ||
                      transfer.approved_at ||
                      transfer.updated_at ||
                      transfer.created_at;

                    return (
                      <tr
                        key={transfer.transfer_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="space-y-1.5">
                            <Link
                              href={`/transferencias/${transfer.transfer_id}`}
                              className="inline-flex rounded-md text-sm font-semibold text-[var(--ops-text)] transition hover:text-[var(--ripnel-accent-hover)]"
                            >
                              {transfer.transfer_number || TRANS.table.noNumber}
                            </Link>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                              {formatTransferScopeRole(transfer.scope_role)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">
                            {transfer.from_location_name}{" "}
                            <span className="text-[var(--ops-text-muted)]">&rarr;</span>{" "}
                            {transfer.to_location_name}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {transfer.from_location_code} / {transfer.to_location_code}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                              getTransferStatusClasses(transfer.status)
                            )}
                          >
                            {formatTransferStatus(transfer.status)}
                          </span>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">{transfer.active_message}</p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <p className="text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                            {transfer.status === "received"
                              ? transfer.qty_received_total
                              : transfer.qty_requested_total}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {transfer.status === "received" ? TRANS.metrics.received : TRANS.metrics.requested}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {formatDateTime(happenedAt)}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                            <Link href={`/transferencias/${transfer.transfer_id}`}>{TRANS.header.viewDetail}</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </OpsTableWrap>

          <OpsTableFooter>
            <span className="text-sm text-[var(--ops-text-muted)]">
              {items.length === 0 ? TRANS.table.zeroResults : `${firstVisible}-${lastVisible} de ${items.length}`}
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
