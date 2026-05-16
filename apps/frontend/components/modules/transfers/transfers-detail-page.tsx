"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { ApiError, apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { buildTransferModuleRoute, transferRouteSlugs } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatTransferStatus,
  getTransferStatusClasses,
  type TransferDetail,
} from "./transfers-shared";

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 border-b border-[var(--ops-border-soft)] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="text-sm text-[var(--ops-text)]">{value}</p>
    </div>
  );
}

export function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let active = true;

    params.then(({ transferId: resolvedTransferId }) => {
      if (active) {
        setTransferId(resolvedTransferId);
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!transferId) {
      return;
    }

    let active = true;

    async function loadTransfer() {
      setLoading(true);
      setError(null);

      try {
        const payload = await apiFetch<ApiEnvelope<TransferDetail> | TransferDetail>(
          `/api/transfers/${transferId}`,
          { cache: "no-store" }
        );
        const data = unwrapApiData(payload);

        if (active) {
          setTransfer(data);
        }
      } catch (loadError) {
        if (active) {
          setTransfer(null);
          setError(
            loadError instanceof Error
              ? loadError
              : new Error("No se pudo cargar la transferencia.")
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTransfer();

    return () => {
      active = false;
    };
  }, [reloadNonce, transferId]);

  const totals = useMemo(() => {
    if (!transfer) {
      return null;
    }

    return transfer.lines.reduce(
      (accumulator, line) => {
        accumulator.lines += 1;
        accumulator.requested += Number(line.qty_requested || 0);
        accumulator.shipped += Number(line.qty_shipped || 0);
        accumulator.received += Number(line.qty_received || 0);
        return accumulator;
      },
      { lines: 0, requested: 0, shipped: 0, received: 0 }
    );
  }, [transfer]);

  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title="Cargando detalle de transferencia"
        description="Estamos recuperando la cabecera operativa y sus líneas asociadas."
      />
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage variant="ops" />;
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenPage variant="ops" />;
  }

  if (error || !transfer || !totals) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir el detalle de transferencia"
        description={
          error?.message || "La transferencia solicitada no está disponible para esta sede."
        }
      />
    );
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow="Seguimiento operativo"
        title={transfer.transfer_number || "Transferencia"}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={buildTransferModuleRoute(transferRouteSlugs.list)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al listado
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => setReloadNonce((current) => current + 1)}
              aria-label="Actualizar detalle"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Estado" value={formatTransferStatus(transfer.status)} tone="accent" />
        <OpsMetricPill label="Líneas" value={totals.lines} />
        <OpsMetricPill label="Solicitado" value={totals.requested} />
        <OpsMetricPill label="Enviado" value={totals.shipped} tone="warning" />
        <OpsMetricPill label="Recibido" value={totals.received} />
      </div>

      <OpsSectionDivider className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <OpsTableBlock>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[var(--ops-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                Resumen operativo
              </h2>
            </div>

            <div className="space-y-4 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    getTransferStatusClasses(transfer.status)
                  )}
                >
                  {formatTransferStatus(transfer.status)}
                </span>
              </div>

              <SummaryItem
                label="Origen"
                value={`${transfer.from_location_name} (${transfer.from_location_code})`}
              />
              <SummaryItem
                label="Destino"
                value={`${transfer.to_location_name} (${transfer.to_location_code})`}
              />
              <SummaryItem
                label="Creada"
                value={`${transfer.created_by_name || "Sin usuario"} · ${formatDateTime(transfer.created_at)}`}
              />
              <SummaryItem
                label="Enviada"
                value={
                  transfer.shipped_at
                    ? `${transfer.shipped_by_name || "Sin usuario"} · ${formatDateTime(transfer.shipped_at)}`
                    : "Pendiente"
                }
              />
              <SummaryItem
                label="Recibida"
                value={
                  transfer.received_at
                    ? `${transfer.received_by_name || "Sin usuario"} · ${formatDateTime(transfer.received_at)}`
                    : "Pendiente"
                }
              />
              {transfer.cancelled_at ? (
                <SummaryItem
                  label="Cancelada"
                  value={`${transfer.cancelled_by_name || "Sin usuario"} · ${formatDateTime(transfer.cancelled_at)}`}
                />
              ) : null}
              {transfer.notes ? <SummaryItem label="Notas" value={transfer.notes} /> : null}
            </div>
          </OpsTableBlock>

          <OpsTableBlock>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[var(--ops-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                Líneas de transferencia
              </h2>
            </div>

            <OpsTableWrap minWidth="920px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Variante</th>
                    <th className="px-4 py-3 text-right">Solicitado</th>
                    <th className="px-4 py-3 text-right">Enviado</th>
                    <th className="px-4 py-3 text-right">Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {transfer.lines.map((line) => (
                    <tr
                      key={line.transfer_line_id}
                      className="transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {line.style_name}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                          {line.style_code || line.sku}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <p className="text-sm text-[var(--ops-text)]">{line.sku}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {line.color_name} / {line.size_code}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                        {line.qty_requested}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm tabular-nums text-[var(--ops-text)]">
                        {line.qty_shipped}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm tabular-nums text-[var(--ops-text)]">
                        {line.qty_received}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OpsTableWrap>
          </OpsTableBlock>
        </div>
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
