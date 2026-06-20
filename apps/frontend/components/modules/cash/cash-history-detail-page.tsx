"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  LogOut,
  User,
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { OpsPanel, OpsPanelMuted } from "@/components/ui/ops-panel";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  CashClosingDetail,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { formatDateTime } from "@/lib/date-utils";
import { useApiGet } from "@/hooks/use-api-get";

import { CashStatusBadge } from "./cash-status-badge";
import { HelpTooltip } from "@/components/ui/help-tooltip";

const METHOD_CONFIG = [
  { key: "cash" as const, label: "Efectivo" },
  { key: "yape" as const, label: "Yape" },
  { key: "plin" as const, label: "Plin" },
  { key: "transfer" as const, label: "Transferencia" },
];

export default function CashHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [cashId, setCashId] = useState<string | null>(null);
  const { data: closing, loading, error } = useApiGet(
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
        <OpsPageShell width="wide">
          <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
            <Link href="/caja/historial">
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </Link>
          </Button>

          <PosHeader
            eyebrow="Detalle de caja"
            title={`${closing.location_name} • ${formatBusinessDate(closing.business_date)}`}
            meta={<CashStatusBadge status={closing.status} className="px-3 py-1.5 text-sm" />}
          />

          <OpsMetricInlineGroup
            items={[
              {
                label: "Total",
                value: formatAmount(closing.total_all),
                tone: "accent",
                icon: <Banknote className="h-3.5 w-3.5" />,
              },
              {
                label: "Ventas",
                value: closing.sales_summary.sale_count,
                tone: "success",
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
              },
              {
                label: "Apertura",
                value: formatDateTime(closing.created_at),
                icon: <Clock3 className="h-3.5 w-3.5" />,
              },
              {
                label: "Cierre",
                value: closing.closed_at ? formatDateTime(closing.closed_at) : "—",
                icon: <LogOut className="h-3.5 w-3.5" />,
              },
              {
                label: "Abrió",
                value: closing.opened_by_name || "—",
                icon: <User className="h-3.5 w-3.5" />,
              },
              {
                label: "Cerró",
                value: closing.closed_by_name || "—",
                icon: <User className="h-3.5 w-3.5" />,
              },
            ]}
          />

          {closing.notes ? (
            <OpsPanelMuted className="p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                Observaciones
              </p>
              <p className="mt-2 text-sm text-[var(--ops-text)]">
                {closing.notes}
              </p>
            </OpsPanelMuted>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <OpsPanel>
              <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                Montos por método
              </h2>
              <div className="mt-4 space-y-1.5">
                {METHOD_CONFIG.map((method) => {
                  const field = `total_${method.key}` as const;
                  return (
                    <OpsMetricRow
                      key={method.key}
                      label={method.label}
                      value={formatAmount(closing[field])}
                    />
                  );
                })}
              </div>
            </OpsPanel>

            <OpsPanel className={consistencyTone}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                      Consistencia
                    </h2>
                    <HelpTooltip content="La diferencia compara ventas confirmadas vs pagos registrados en el sistema. No representa arqueo físico." />
                  </div>
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {closing.sales_summary.consistency.is_consistent
                      ? "Los pagos coinciden con las ventas confirmadas."
                      : "Hay diferencia entre ventas y pagos. Revisar movimientos."}
                  </p>
                </div>

                {closing.sales_summary.consistency.is_consistent ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--ops-tone-success-text)]" />
                ) : (
                  <AlertTriangle className="h-6 w-6 shrink-0 text-[var(--ops-tone-warning-text)]" />
                )}
              </div>

              <div className="mt-4 space-y-1.5">
                <OpsMetricRow
                  label="Total ventas"
                  value={formatAmount(closing.sales_summary.grand_total)}
                />
                <OpsMetricRow
                  label="Total pagos"
                  value={formatAmount(closing.sales_summary.consistency.payment_total)}
                />
                <OpsMetricRow
                  label="Diferencia"
                  value={formatAmount(closing.sales_summary.consistency.difference)}
                  tone={closing.sales_summary.consistency.is_consistent ? undefined : "warning"}
                />
              </div>
            </OpsPanel>
          </div>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  );
}
