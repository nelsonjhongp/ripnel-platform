"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Smartphone,
} from "lucide-react";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { LoadingPage } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { OpsActionBanner } from "@/components/ui/ops-action-banner";
import { Button } from "@/components/ui/button";
import { OpsPanelMuted } from "@/components/ui/ops-panel";
import { OpsMetricCard } from "@/components/ui/ops-metric-card";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { AdminActionButton } from "@/components/admin/admin-ui";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { apiFetch } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { resolveCashCapabilities } from "@/lib/capabilities";
import {
  CurrentCashResponse,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { showSuccess, showError } from "@/lib/toast";
import { explainApiError } from "@/lib/error-utils";

import { HelpTooltip } from "@/components/ui/help-tooltip";

const METHOD_CONFIG = [
  { key: "cash" as const, label: "Efectivo", icon: Banknote },
  { key: "yape" as const, label: "Yape", icon: Smartphone },
  { key: "plin" as const, label: "Plin", icon: Smartphone },
  { key: "transfer" as const, label: "Transferencia", icon: ArrowRightLeft },
];

export default function CajaPage() {
  const { defaultLocation, permissions } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const locationId = defaultLocation?.location_id;
  const cashCapabilities = resolveCashCapabilities({ permissions });
  const canOperateCash = cashCapabilities.operate;

  const { data: current, loading, error, refetch } = useApiGet(
    locationId
      ? () => apiFetch<CurrentCashResponse>(`/api/cash/current?location_id=${locationId}`, { cache: "no-store" })
      : null,
    [locationId]
  );

  async function handleOpen() {
    if (!locationId || actionLoading || !canOperateCash) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await apiFetch("/api/cash/open", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId }),
      });
      refetch();
      showSuccess("Caja abierta", "La sesión de caja está lista para operar.");
    } catch (err) {
      showError("Error al abrir caja", explainApiError(err, "No se pudo aperturar la caja."));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose() {
    if (!current?.closing || actionLoading || !canOperateCash) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await apiFetch(`/api/cash/${current.closing.cash_closing_id}/close`, {
        method: "PATCH",
        body: JSON.stringify({ notes: closeNotes || undefined }),
      });
      setShowCloseConfirm(false);
      setCloseNotes("");
      refetch();
      showSuccess("Caja cerrada", "La jornada fue cerrada correctamente.");
    } catch (err) {
      showError("Error al cerrar caja", explainApiError(err, "No se pudo cerrar la caja."));
    } finally {
      setActionLoading(false);
    }
  }

  if (!locationId) {
    return (
      <ErrorBoundary>
        <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
          <OpsPageShell>
            <InlineStatusCard
              title="Sin sede asignada"
              description="Tu usuario no tiene una sede default configurada. Contacta a un administrador antes de aperturar caja."
              tone="warning"
              variant="ops"
            />
          </OpsPageShell>
        </PermissionGuard>
      </ErrorBoundary>
    );
  }

  const isClosed = current?.closing?.status === "closed";
  const isOpen = current?.closing?.status === "open";
  const summary = current?.sales_summary;
  const businessDate = current?.business_date;
  const consistencyOk = summary?.consistency.is_consistent ?? true;

  const cashStatusMeta = businessDate ? (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ops-text)]">
      {formatBusinessDate(businessDate)}
      <HelpTooltip content="La fecha operativa corresponde al día de trabajo de la sede actual en horario de Lima." />
    </span>
  ) : null;

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {isOpen ? (
        <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
          <Link href="/ventas">Ir a venta</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
        <Link href="/caja/historial">Historial</Link>
      </Button>
      <AdminActionButton
        onClick={refetch}
        disabled={loading || actionLoading}
      >
        <RefreshCw className="h-4 w-4" />
        Actualizar
      </AdminActionButton>
    </div>
  );

  const cashStatusBanner = isOpen ? (
    <OpsActionBanner
      icon={CheckCircle2}
      tone="success"
      title="Caja operativa abierta"
      description={
        current?.closing?.opened_by_name
          ? `Abierta por ${current.closing.opened_by_name}`
          : undefined
      }
      actionLabel="Cerrar caja"
      actionTone="neutral"
      onAction={() => setShowCloseConfirm(true)}
      loading={actionLoading}
    />
  ) : isClosed ? (
    <OpsActionBanner
      icon={Clock3}
      tone="neutral"
      title="Caja cerrada"
      description={
        current?.closing?.closed_by_name
          ? `Cerrada por ${current.closing.closed_by_name}`
          : undefined
      }
    />
  ) : (
    <OpsActionBanner
      icon={Clock3}
      tone="warning"
      title="Aún no se abrió caja"
      description="Abre caja para habilitar ventas en esta sede."
      actionLabel="Abrir caja"
      actionTone="accent"
      onAction={handleOpen}
      loading={actionLoading}
    />
  );

  const summaryMetricItems = summary
    ? [
        {
          key: "total",
          icon: <Banknote className="h-4 w-4" />,
          label: (
            <>
              Total del día
              <HelpTooltip content="Suma de ventas confirmadas en la fecha operativa actual." />
            </>
          ),
          value: formatAmount(summary.grand_total),
          tone: "accent" as const,
        },
        {
          key: "ventas",
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Ventas",
          value: `${summary.sale_count} confirmadas`,
          tone: "success" as const,
        },
        {
          key: "consistencia",
          icon: consistencyOk ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          ),
          label: (
            <>
              Consistencia
              <HelpTooltip content="Compara el total de ventas contra los pagos registrados. Si no cuadra, revisa posibles diferencias." />
            </>
          ),
          value: consistencyOk ? "Cuadra" : "Revisar",
          tone: consistencyOk ? ("success" as const) : ("warning" as const),
        },
      ]
    : null;

  return (
    <ErrorBoundary>
      <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
        <TooltipProvider delayDuration={120}>
          <OpsPageShell>
            <PosHeader
              eyebrow="Caja"
              title="Caja del día"
              meta={cashStatusMeta}
              actions={headerActions}
            />

            {(error || actionError) ? (
              <InlineStatusCard
                title="Error de caja"
                description={actionError || error || ""}
                tone="danger"
                variant="ops"
              />
            ) : null}

            {!canOperateCash ? (
              <InlineStatusCard
                title="Acceso de consulta"
                description="Tu usuario puede revisar la caja y su consistencia, pero no aperturar ni cerrar sesiones desde esta pantalla."
                tone="warning"
                variant="ops"
              />
            ) : null}

            {loading ? (
              <LoadingPage
                title="Cargando caja"
                description="Consultando el estado de la caja actual para tu sede operativa."
                variant="ops"
              />
            ) : (
              <>
                {cashStatusBanner}

                {summary && summaryMetricItems ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {summaryMetricItems.map((item) => (
                        <OpsMetricCard
                          key={item.key}
                          icon={item.icon}
                          label={item.label}
                          value={item.value}
                          tone={item.tone}
                          className="px-3 py-3.5"
                        />
                      ))}
                    </div>

                    <OpsPanelMuted className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Medios de pago
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {METHOD_CONFIG.map((method) => (
                            <OpsMetricRow
                              key={method.key}
                              label={method.label}
                              value={formatAmount(summary.by_method[method.key])}
                            />
                        ))}
                      </div>
                      <div className="mt-3 border-t border-[var(--ops-border-soft)] pt-3">
                        <OpsMetricRow
                          label={
                            <>
                              Total pagos
                              <HelpTooltip content="Total de pagos registrados en el sistema para esta fecha." />
                            </>
                          }
                          value={formatAmount(summary.consistency.payment_total)}
                        />
                      </div>
                    </OpsPanelMuted>
                  </>
                ) : null}
              </>
            )}

            <OpsDialog
              open={showCloseConfirm && canOperateCash}
              onOpenChange={(open) => { if (!open) setShowCloseConfirm(false) }}
              title="Confirmar cierre de caja"
              size="md"
              bodyClassName="space-y-4"
              footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <AdminActionButton type="button" onClick={() => setShowCloseConfirm(false)} disabled={actionLoading}>
                    Cancelar
                  </AdminActionButton>
                  <AdminActionButton type="button" tone="accent" onClick={handleClose} disabled={actionLoading}>
                    {actionLoading ? "Procesando..." : "Cerrar caja"}
                  </AdminActionButton>
                </div>
              }
            >
              <div>
                <p className="mb-3 text-sm text-[var(--ops-text-muted)]">
                  Se consolidaran los pagos registrados y ventas confirmadas
                  de la fecha operativa actual para esta sede.
                </p>

                {summary ? (
                  <div className="sales-panel-muted space-y-1 rounded-xl p-4">
                    {METHOD_CONFIG.map((method) => (
                      <div
                        key={method.key}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-[var(--ops-text-muted)]">
                          {method.label}
                        </span>
                        <span className="font-medium text-[var(--ops-text)]">
                          {formatAmount(summary.by_method[method.key])}
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-sm font-semibold">
                      <span className="text-[var(--ops-text)]">Total</span>
                      <span className="text-[var(--ops-text)]">
                        {formatAmount(summary.grand_total)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <label htmlFor="close-notes" className="mb-1 block text-xs font-medium text-[var(--ops-text)]">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    id="close-notes"
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    rows={2}
                    placeholder="Ej: Sin novedades"
                    className="sales-field w-full rounded-lg px-3 py-2 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,transparent)]"
                  />
                </div>
              </div>
            </OpsDialog>
          </OpsPageShell>
        </TooltipProvider>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
