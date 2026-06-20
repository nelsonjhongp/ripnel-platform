"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  Smartphone,
} from "lucide-react";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  ErrorPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { apiFetch } from "@/lib/api";
import {
  CashClosingDetail,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { formatDateTime } from "@/lib/date-utils";
import { useApiGet } from "@/hooks/use-api-get";

const METHOD_CONFIG = [
  { key: "cash" as const, label: "Efectivo", icon: Banknote },
  { key: "yape" as const, label: "Yape", icon: Smartphone },
  { key: "plin" as const, label: "Plin", icon: Smartphone },
  { key: "transfer" as const, label: "Transferencia", icon: ArrowRightLeft },
];

import { CashStatusBadge } from "./cash-status-badge"
import { HelpTooltip } from "@/components/ui/help-tooltip"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"

export default function CashHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [cashId, setCashId] = useState<string | null>(null);
  const { data: closing, loading, error, refetch } = useApiGet(
    cashId ? () => apiFetch<CashClosingDetail>(`/api/cash/${cashId}`) : null,
    [cashId]
  );

  useEffect(() => {
    let active = true;

    params.then(({ id }) => {
      if (active) {
        setCashId(id);
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  const consistencyTone = useMemo(() => {
    if (!closing?.sales_summary.consistency.is_consistent) {
      return "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)]";
    }

    return "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)]";
  }, [closing]);

  if (loading) {
    return (
      <LoadingPage
        title="Cargando detalle de caja"
        description="Estamos recuperando la sesión de caja, sus montos y la consistencia operativa."
        variant="ops"
      />
    );
  }

  if (error || !closing) {
    return (
      <ErrorPage
        title="No pudimos abrir el detalle de caja"
        description={
          error ||
          "La sesión solicitada no está disponible para esta sede."
        }
        variant="ops"
      />
    );
  }

  return (
    <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide" className="space-y-5">
            <Link
              href="/caja/historial"
              className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </Link>

            <header className="px-1 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">
                      Detalle de caja
                    </p>
                    <HelpTooltip content="Vista detallada de la sesión elegida, con auditoría, montos y consistencia del sistema." />
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-[1.75rem]">
                    {closing.location_name} •{" "}
                    {formatBusinessDate(closing.business_date)}
                  </h1>
                </div>

                <CashStatusBadge status={closing.status} className="px-3 py-1.5 text-sm" />
              </div>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              <OpsMetricPill
                label="Total caja"
                value={formatAmount(closing.total_all)}
                tone="accent"
              />
              <OpsMetricPill
                label="Ventas"
                value={closing.sales_summary.sale_count}
                tone="accent"
              />
              <OpsMetricPill
                label="Apertura"
                value={formatDateTime(closing.created_at)}
              />
              <OpsMetricPill
                label="Cierre"
                value={
                  closing.closed_at
                    ? formatDateTime(closing.closed_at)
                    : "Pendiente"
                }
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                  Auditoría de la sesión
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sales-panel-muted rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Aperturada por
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ops-text)]">
                      {closing.opened_by_name || "Usuario no identificado"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {formatDateTime(closing.created_at)}
                    </p>
                  </div>
                  <div className="sales-panel-muted rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Cerrada por
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ops-text)]">
                      {closing.closed_by_name || "Aún sin cierre"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {closing.closed_at
                        ? formatDateTime(closing.closed_at)
                        : "Pendiente"}
                    </p>
                  </div>
                </div>

                {closing.notes ? (
                  <div className="sales-field mt-4 rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Observaciones
                    </p>
                    <p className="mt-2 text-sm text-[var(--ops-text)]">
                      {closing.notes}
                    </p>
                  </div>
                ) : null}
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                  Montos por método
                </h2>
                <div className="mt-4 space-y-2">
                  {METHOD_CONFIG.map((method) => {
                    const Icon = method.icon;
                    const field = `total_${method.key}` as const;
                    const value = closing[field];

                    return (
                      <div
                        key={method.key}
                        className="sales-panel-muted flex items-center justify-between rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[var(--ops-text-muted)]" />
                          <span className="text-sm font-medium text-[var(--ops-text)]">
                            {method.label}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatAmount(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="sales-chip sales-chip-accent mt-4 rounded-xl px-4 py-4">
                  <p className="text-xs uppercase tracking-wide">
                    Total consolidado
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatAmount(closing.total_all)}
                  </p>
                </div>
              </article>
            </div>

            <article
              className={`sales-panel rounded-lg p-5 shadow-sm md:p-6 ${consistencyTone}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                      Consistencia operativa
                    </h2>
                    <HelpTooltip content="La diferencia compara ventas confirmadas vs pagos registrados en el sistema. No representa arqueo físico." />
                  </div>
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {closing.sales_summary.consistency.is_consistent
                      ? "Los pagos del sistema coinciden con el total de ventas confirmadas para esta fecha operativa."
                      : "Hay diferencia entre ventas y pagos registrados. Conviene revisar los movimientos antes de usar este cierre como referencia final."}
                  </p>
                </div>

                {closing.sales_summary.consistency.is_consistent ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:color-mix(in_srgb,#059669_80%,var(--ops-text))]" />
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                    Total ventas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(closing.sales_summary.grand_total)}
                  </p>
                </div>
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                    Total pagos
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(
                      closing.sales_summary.consistency.payment_total,
                    )}
                  </p>
                </div>
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                    Diferencia
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(closing.sales_summary.consistency.difference)}
                  </p>
                </div>
              </div>
            </article>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  );
}
