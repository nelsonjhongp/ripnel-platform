"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, RotateCcw, RotateCw } from "lucide-react";

import { Pagination } from "@/components/ui/pagination";
import { OpsPageShell, OpsFiltersRow, OpsTableBlock, OpsTableFooter } from "@/components/ui/ops-page-shell";
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ui/ops-data-table";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { Button } from "@/components/ui/button";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { AdminActionButton } from "@/components/admin/admin-ui";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  ErrorPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { ApiError, apiFetch } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { usePagination } from "@/hooks/use-pagination";
import {
  CashClosingsResponse,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { formatDateTime } from "@/lib/date-utils";

import { CashStatusBadge } from "./cash-status-badge";

type StatusFilter = "all" | "open" | "closed";

const STATUS_OPTIONS: OpsOption[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Pendientes" },
  { value: "closed", label: "Cerradas" },
];

const PAGE_SIZE = 10;

const tableColumns: OpsDataTableColumn[] = [
  { key: "fecha", header: "Fecha" },
  { key: "abrio", header: "Abrió" },
  { key: "cerro", header: "Cerró" },
  { key: "total", header: "Total" },
  { key: "accion", header: "" },
];

export default function CashHistoryPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CashClosingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryParts = status !== "all" ? [`status=${status}`] : [];
  queryParts.push(`page=${page}`, `pageSize=${PAGE_SIZE}`);
  const query = queryParts.join("&");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<CashClosingsResponse>(
          `/api/cash?${query}`,
          { cache: "no-store" },
        );

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el historial.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;

  const hasActiveFilters = status !== "all";

  function clearFilters() {
    setStatus("all");
    setPage(1);
  }

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  if (loading && !data) {
    return (
      <LoadingPage
        title="Cargando historial de caja"
        description="Estamos recuperando las sesiones de caja registradas para tu sede operativa."
        variant="ops"
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorPage
        title="No pudimos abrir el historial de caja"
        description={error}
        variant="ops"
      />
    );
  }

  return (
    <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide" className="space-y-5">
            <header className="px-1 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
                      Caja
                    </p>
                    <HelpTooltip content="Aquí revisas las sesiones diarias registradas de la sede actual, con su estado y total consolidado." />
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-[1.75rem]">
                    Historial de caja
                  </h1>
                </div>

          <OpsTableBlock>
            <OpsFiltersRow className="lg:grid-cols-[0.84fr_auto]">
              <OpsSelect
                label="Estado"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 rounded-lg"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            <OpsDataTable
              columns={tableColumns}
              loading={loading}
              isEmpty={items.length === 0}
              emptyMessage="No se encontraron sesiones de caja para los filtros elegidos."
              footer={
                pagination && pagination.total_items > 0 ? (
                  <OpsTableFooter>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {(pagination.page - 1) * pagination.page_size + 1}-{Math.min(pagination.page * pagination.page_size, pagination.total_items)} de {pagination.total_items}
                    </span>
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.total_pages}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </article>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  );
}
