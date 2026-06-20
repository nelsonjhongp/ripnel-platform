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
import { apiFetch } from "@/lib/api";
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
        <OpsPageShell width="wide">
          <PosHeader
            eyebrow="Caja"
            title="Historial de caja"
            actions={
              <AdminActionButton onClick={refetch}>
                <RotateCw className="h-4 w-4" />
                Actualizar
              </AdminActionButton>
            }
          />

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
                  </OpsTableFooter>
                ) : undefined
              }
            >
              {items.map((closing) => (
                <tr
                  key={closing.cash_closing_id}
                  className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                >
                  <td className="px-4 py-[var(--ops-row-py)] text-sm font-medium text-[var(--ops-text)]">
                    {formatBusinessDate(closing.business_date)}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                    <span className="font-medium text-[var(--ops-text)]">
                      {closing.opened_by_name || "—"}
                    </span>
                    <span className="ml-2 text-xs">
                      {formatDateTime(closing.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    {closing.closed_at ? (
                      <span className="text-[var(--ops-text-muted)]">
                        <span className="font-medium text-[var(--ops-text)]">
                          {closing.closed_by_name || "—"}
                        </span>
                        <span className="ml-2 text-xs">
                          {formatDateTime(closing.closed_at)}
                        </span>
                      </span>
                    ) : (
                      <CashStatusBadge status={closing.status} />
                    )}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="font-semibold">
                      {formatAmount(closing.total_all)}
                    </p>
                    {closing.is_consistent === false ? (
                       <p className="text-xs text-[var(--ops-tone-warning-text)]">
                        Dif. {formatAmount(closing.difference)}
                      </p>
                    ) : closing.status === "closed" ? (
                       <p className="text-xs text-[var(--ops-tone-success-text)]">OK</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <Link
                      href={`/caja/historial/${closing.cash_closing_id}`}
                      className="inline-flex items-center text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </OpsDataTable>
          </OpsTableBlock>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  );
}
