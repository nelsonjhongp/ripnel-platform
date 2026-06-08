"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, History, RefreshCw } from "lucide-react";

import { Pagination } from "@/components/ui/pagination";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  ErrorPage,
  InlineStatusCard,
  LoadingPage,
} from "@/components/feedback/status-page";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ApiError, apiFetch } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { usePagination } from "@/hooks/use-pagination";
import {
  CashClosing,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { formatDateTime } from "@/lib/date-utils";

type RangeFilter = "7d" | "30d";
type StatusFilter = "all" | "open" | "closed";

function explainCashHistoryError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudo cargar el historial de caja.";
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso al historial de caja.";
  }

  return error.message || "No se pudo cargar el historial de caja.";
}

import { CashStatusBadge } from "./cash-status-badge"
import { HelpTooltip } from "@/components/ui/help-tooltip"

function SummaryMetric({
  label,
  value,
  valueClassName = "text-[var(--ops-text)]",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

export default function CashHistoryPage() {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data: historyData, loading, error, refetch } = useApiGet(
    () => apiFetch<CashClosing[]>(`/api/cash/history?range=${range}&status=${status}`, { cache: "no-store" }),
    [range, status]
  );
  const history = historyData ?? [];

  const stats = useMemo(() => {
    const openCount = history.filter((item) => item.status === "open").length;
    const closedCount = history.filter(
      (item) => item.status === "closed",
    ).length;
    const totalRegistered = history.reduce(
      (acc, item) => acc + Number(item.total_all || 0),
      0,
    );

    return {
      count: history.length,
      openCount,
      closedCount,
      totalRegistered,
    };
  }, [history]);

  const { paginatedItems: visibleRows, totalPages, safePage, setPage } = usePagination(history)

  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [range, status, setPage]);

  if (loading) {
    return (
      <LoadingPage
        title="Cargando historial de caja"
        description="Estamos recuperando las sesiones de caja registradas para tu sede operativa."
        variant="ops"
      />
    );
  }

  if (error) {
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
        <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-6xl space-y-5">
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

                <button
                  type="button"
                  onClick={refetch}
                  className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "7d", label: "7 días" },
                  { value: "30d", label: "30 días" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value as RangeFilter)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      range === option.value
                        ? "bg-[var(--ops-text)] text-[var(--ops-surface)]"
                        : "sales-field text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "Todas" },
                  { value: "open", label: "Pendientes" },
                  { value: "closed", label: "Cerradas" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value as StatusFilter)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      status === option.value
                        ? "bg-[var(--ripnel-accent)] text-white"
                        : "sales-field text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <SummaryMetric label="Sesiones" value={stats.count} />
              <SummaryMetric
                label="Pendientes"
                value={stats.openCount}
                valueClassName="text-[color:color-mix(in_srgb,#d97706_78%,var(--ops-text))]"
              />
              <SummaryMetric label="Cerradas" value={stats.closedCount} />
              <SummaryMetric
                label="Total registrado"
                value={formatAmount(stats.totalRegistered)}
                valueClassName="text-[var(--ripnel-accent-hover)]"
              />
            </div>

            <article>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  Sesiones registradas
                </p>
              </div>

              {history.length === 0 ? (
                <div className="mt-4">
                  <InlineStatusCard
                    title="Sin sesiones registradas"
                    description="No se encontraron aperturas o cierres de caja para los filtros elegidos."
                    tone="neutral"
                    variant="ops"
                  />
                </div>
              ) : (
                <>
                  <div className="mt-4 hidden grid-cols-[1.15fr_1fr_1fr_0.7fr_28px] items-center gap-3 border-b border-[var(--ops-border-strong)] px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)] md:grid">
                    <span>Sesión</span>
                    <span>Movimiento</span>
                    <span>Responsable</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="divide-y divide-[var(--ops-border-strong)]">
                    {visibleRows.map((closing) => (
                      <Link
                        key={closing.cash_closing_id}
                        href={`/caja/historial/${closing.cash_closing_id}`}
                        className="grid gap-3 px-3 py-4 transition hover:bg-[var(--ops-surface-muted)] md:grid-cols-[1.15fr_1fr_1fr_0.7fr_28px] md:items-center"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {formatBusinessDate(closing.business_date)}
                            </p>
                            <CashStatusBadge status={closing.status} />
                          </div>
                          <p className="text-sm text-[var(--ops-text)]">
                            {closing.location_name}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-[var(--ops-text-muted)]">
                          <p>
                            Apertura:{" "}
                            <span className="font-medium text-[var(--ops-text)]">
                              {formatDateTime(closing.created_at)}
                            </span>
                          </p>
                          <p>
                            {closing.closed_at ? (
                              <>
                                Cierre:{" "}
                                <span className="font-medium text-[var(--ops-text)]">
                                  {formatDateTime(closing.closed_at)}
                                </span>
                              </>
                            ) : (
                              "Cierre pendiente"
                            )}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-[var(--ops-text-muted)]">
                          <p className="font-medium text-[var(--ops-text)]">
                            {closing.opened_by_name ||
                              "Usuario no identificado"}
                          </p>
                          {closing.is_consistent === false ? (
                            <p className="text-[color:color-mix(in_srgb,#d97706_78%,var(--ops-text))]">
                              Diferencia {formatAmount(closing.difference)}
                            </p>
                          ) : (
                            <p className="text-[color:color-mix(in_srgb,#059669_80%,var(--ops-text))]">
                              Consistencia OK
                            </p>
                          )}
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-base font-semibold text-[var(--ops-text)]">
                            {formatAmount(closing.total_all)}
                          </p>
                        </div>

                        <div className="flex items-center justify-end text-[var(--ops-text-muted)]">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-[var(--ops-border-strong)] pt-4">
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  );
}
