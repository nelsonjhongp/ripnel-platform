"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Truck,
} from "lucide-react";
import {
  AdminConfirmModal,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { Button } from "@/components/ui/button";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime, type TransferSummary } from "./transfers-shared";

export function TransfersPendingPage() {
  const { loading: authLoading, permissions, user } = useAuth();
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [pendingReceiveTransfer, setPendingReceiveTransfer] = useState<TransferSummary | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);

  const transferCapabilities = useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
  );

  async function loadTransfers() {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<ApiEnvelope<TransferSummary[]> | TransferSummary[]>(
        "/api/transfers/pending-receipts",
        { cache: "no-store" }
      );
      const data = unwrapApiData(payload);
      setTransfers(data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar recepciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadTransfers();
    });
  }, []);

  async function handleReceiveTransfer(transferId: string) {
    setReceivingId(transferId);
    setError(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/receive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadTransfers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo recepcionar la transferencia"
      );
    } finally {
      setReceivingId(null);
    }
  }

  const filteredTransfers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transfers.filter((transfer) => {
      return (
        !normalizedQuery ||
        (transfer.transfer_number || "").toLowerCase().includes(normalizedQuery) ||
        transfer.from_location_name.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_name.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, transfers]);

  const totals = useMemo(
    () => ({
      pendingTransfers: filteredTransfers.length,
      pendingUnits: filteredTransfers.reduce(
        (accumulator, transfer) => accumulator + transfer.qty_shipped_total,
        0
      ),
    }),
    [filteredTransfers]
  );

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransfers = filteredTransfers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const firstVisible = filteredTransfers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastVisible = Math.min(safePage * pageSize, filteredTransfers.length);

  const hasActiveFilters = query !== "";

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando recepciones"
        description="Validando la sede activa y los permisos para confirmar ingresos pendientes."
      />
    );
  }

  if (!transferCapabilities.receive) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Recepcion operativa"
          title="Recepciones pendientes"
          actions={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => void loadTransfers()}
                    disabled={loading}
                    className="rounded-lg"
                    aria-label="Actualizar recepciones"
                  >
                    {loading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar recepciones</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <OpsMetricPill label="Pendientes" value={totals.pendingTransfers} tone="accent" />
          <OpsMetricPill label="Unidades" value={totals.pendingUnits} tone="warning" />
        </div>

        <OpsSectionDivider>
          <OpsTableBlock>
            <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_auto]">
              <OpsSearchField
                value={query}
                onChange={(value) => {
                  setQuery(value)
                  setCurrentPage(1)
                }}
                placeholder="Buscar por numero, origen o destino"
                ariaLabel="Buscar recepciones pendientes"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon-sm" onClick={() => {
                      setQuery("")
                      setCurrentPage(1)
                    }}
                      disabled={!hasActiveFilters} className="rounded-lg" aria-label="Limpiar filtros">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar filtros</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </OpsFiltersRow>

            <OpsTableWrap minWidth="720px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Numero</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Enviada</th>
                    <th className="px-4 py-3 text-right">Unidades</th>
                    <th className="px-4 py-3 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        Cargando recepciones pendientes...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6">
                        <InlineStatusCard title="No pudimos cargar recepciones" description={error} tone="danger" variant="ops" />
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        {transfers.length === 0
                          ? "No hay transferencias pendientes de recepcion."
                          : "No existen recepciones para los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransfers.map((transfer) => (
                      <tr
                        key={transfer.transfer_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            {transfer.transfer_number || "Sin numero"}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">
                            {transfer.from_location_name}{" "}
                            <span className="text-[var(--ops-text-muted)]">&rarr;</span>{" "}
                            {transfer.to_location_name}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {transfer.to_location_code}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {formatDateTime(transfer.shipped_at)}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]">
                            <Truck className="h-3 w-3" />
                            {transfer.qty_shipped_total}
                          </span>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <AdminRowActionsMenu
                            ariaLabel={`Acciones para ${transfer.transfer_number || "transferencia"}`}
                            items={[
                              {
                                label: "Confirmar recepcion",
                                icon:
                                  receivingId === transfer.transfer_id ? (
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  ),
                                onSelect: () => setPendingReceiveTransfer(transfer),
                                disabled: receivingId === transfer.transfer_id,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </OpsTableWrap>

            <OpsTableFooter>
              <span className="text-sm text-[var(--ops-text-muted)]">
                {filteredTransfers.length === 0
                  ? "0 resultados"
                  : `${firstVisible}-${lastVisible} de ${filteredTransfers.length}`}
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

      <AdminConfirmModal
        open={Boolean(pendingReceiveTransfer)}
        title="Confirmar recepción"
        description={
          pendingReceiveTransfer ? (
            <>
              Se confirmará la recepción de la transferencia{" "}
              <strong>{pendingReceiveTransfer.transfer_number || "sin numero"}</strong> y el stock
              ingresará en destino.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Confirmar recepción"
        confirmTone="accent"
        busy={Boolean(
          pendingReceiveTransfer && receivingId === pendingReceiveTransfer.transfer_id
        )}
        onCancel={() => setPendingReceiveTransfer(null)}
        onConfirm={() => {
          if (pendingReceiveTransfer) {
            void handleReceiveTransfer(pendingReceiveTransfer.transfer_id);
            setPendingReceiveTransfer(null);
          }
        }}
      />
    </OpsPageShell>
  );
}
