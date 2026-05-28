"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CheckCheck,
  ClipboardList,
  Eye,
  LoaderCircle,
  Plus,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  SendHorizonal,
  Truck,
  X,
} from "lucide-react";
import {
  AdminConfirmModal,
  AdminInlineMessage,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { buildTransferModuleRoute, transferRouteSlugs } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
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
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDateTime,
  formatTransferStatus,
  getTransferStatusClasses,
  type TransferStatusFilter,
  TRANSFER_STATUS_FILTER_OPTIONS,
  type TransferSummary,
} from "./transfers-shared";

export function TransfersListPage() {
  const router = useRouter();
  const { loading: authLoading, permissions, user, defaultLocation } = useAuth();
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatusFilter>("all");
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<TransferStatusFilter>("all");
  const [pendingShipTransfer, setPendingShipTransfer] = useState<TransferSummary | null>(null);
  const [pendingCancelTransfer, setPendingCancelTransfer] = useState<TransferSummary | null>(
    null
  );
  const [pendingReceiveTransfer, setPendingReceiveTransfer] = useState<TransferSummary | null>(null);

  const transferCapabilities = useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
  );

  async function loadTransfers() {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<ApiEnvelope<TransferSummary[]> | TransferSummary[]>(
        "/api/transfers",
        { cache: "no-store" }
      );
      const data = unwrapApiData(payload);
      setTransfers(data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar transferencias"
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

  async function handleApproveTransfer(transferId: string) {
    setApprovingId(transferId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice("Solicitud aprobada para despacho.");
      await loadTransfers();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo aprobar la solicitud"
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function handleShipTransfer(transferId: string) {
    setShippingId(transferId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/ship`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice("Transferencia despachada.");
      await loadTransfers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo enviar la transferencia"
      );
    } finally {
      setShippingId(null);
    }
  }

  async function handleCancelTransfer(transferId: string) {
    setCancellingId(transferId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice("Transferencia cancelada.");
      await loadTransfers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cancelar la transferencia"
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function handleReceiveTransfer(transferId: string) {
    setReceivingId(transferId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/receive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice("Transferencia recepcionada.");
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
      const activeStatusFilter = statusFilter === "all" ? stageFilter : statusFilter;
      const matchesStatus = activeStatusFilter === "all" || transfer.status === activeStatusFilter;
      const matchesQuery =
        !normalizedQuery ||
        (transfer.transfer_number || "").toLowerCase().includes(normalizedQuery) ||
        transfer.from_location_code.toLowerCase().includes(normalizedQuery) ||
        transfer.from_location_name.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_code.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_name.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, stageFilter, statusFilter, transfers]);

  const totals = useMemo(
    () => ({
      total: filteredTransfers.length,
      requested: filteredTransfers.filter((transfer) => transfer.status === "requested").length,
      approved: filteredTransfers.filter((transfer) => transfer.status === "approved").length,
      shipped: filteredTransfers.filter((transfer) => transfer.status === "shipped").length,
      requestedUnits: filteredTransfers.reduce(
        (accumulator, transfer) => accumulator + transfer.qty_requested_total,
        0
      ),
    }),
    [filteredTransfers]
  );

  const stageTotals = useMemo(
    () => ({
      all: transfers.length,
      requested: transfers.filter((transfer) => transfer.status === "requested").length,
      approved: transfers.filter((transfer) => transfer.status === "approved").length,
      shipped: transfers.filter((transfer) => transfer.status === "shipped").length,
      received: transfers.filter((transfer) => transfer.status === "received").length,
      cancelled: transfers.filter((transfer) => transfer.status === "cancelled").length,
    }),
    [transfers]
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
  const hasActiveFilters = query !== "" || statusFilter !== "all" || stageFilter !== "all";

  function handleFilterChange(fn: () => void) {
    fn();
    setCurrentPage(1);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando seguimiento de transferencias"
        description="Validando capacidades visibles para mostrar solicitudes, despachos y recepciones entre sedes."
      />
    );
  }

  if (!transferCapabilities.visible) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Logística entre sedes"
          title="Solicitudes y transferencias"
          actions={
            <>
              {transferCapabilities.requestCreate && (
                <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                  <Link href={buildTransferModuleRoute(transferRouteSlugs.requestProducts)}>
                    <Plus className="h-4 w-4" />
                    Solicitar reposición
                  </Link>
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void loadTransfers()}
                      disabled={loading}
                      className="rounded-lg"
                      aria-label="Actualizar transferencias"
                    >
                      {loading ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Actualizar transferencias</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <OpsMetricPill label="Total" value={totals.total} tone="accent" />
          <OpsMetricPill label="Solicitadas" value={totals.requested} />
          <OpsMetricPill label="Aprobadas" value={totals.approved} />
          <OpsMetricPill label="Despachadas" value={totals.shipped} tone="warning" />
          <OpsMetricPill label="Unidades solicitadas" value={totals.requestedUnits} />
        </div>

        <OpsSectionDivider>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todas", count: stageTotals.all },
              { value: "requested", label: "Solicitadas", count: stageTotals.requested },
              { value: "approved", label: "Aprobadas", count: stageTotals.approved },
              { value: "shipped", label: "Despachadas", count: stageTotals.shipped },
              { value: "received", label: "Recepcionadas", count: stageTotals.received },
              { value: "cancelled", label: "Canceladas", count: stageTotals.cancelled },
            ].map((stage) => (
              <button
                key={stage.value}
                type="button"
                onClick={() => handleFilterChange(() => setStageFilter(stage.value as TransferStatusFilter))}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  stageFilter === stage.value
                    ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
                    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                )}
              >
                {stage.label}
                <span className="rounded-full bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_78%,transparent)] px-2 py-0.5 text-[11px]">
                  {stage.count}
                </span>
              </button>
            ))}
          </div>
          <OpsTableBlock>
            <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto]">
              <OpsSearchField
                value={query}
                onChange={(value) => handleFilterChange(() => setQuery(value))}
                placeholder="Buscar por solicitud, origen o destino"
                ariaLabel="Buscar transferencias"
              />

              <FilterDropdown
                label="Estado"
                value={statusFilter}
                options={TRANSFER_STATUS_FILTER_OPTIONS}
                onChange={(value) =>
                  handleFilterChange(() => setStatusFilter(value as TransferStatusFilter))
                }
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        handleFilterChange(() => {
                          setQuery("");
                          setStatusFilter("all");
                          setStageFilter("all");
                        })
                      }
                      disabled={!hasActiveFilters}
                      className="rounded-lg"
                      aria-label="Limpiar filtros"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar filtros</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </OpsFiltersRow>

            <OpsTableWrap minWidth="960px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Lineas</th>
                    <th className="px-4 py-3 text-right">Solicitado</th>
                    <th className="px-4 py-3">Solicitada</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        Cargando transferencias...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6">
                        <InlineStatusCard
                          title="No pudimos cargar transferencias"
                          description={error}
                          tone="danger"
                          variant="ops"
                        />
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        {transfers.length === 0
                          ? "No existen transferencias registradas."
                          : "No existen transferencias para los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransfers.map((transfer) => {
                        const canCancel =
                          (transfer.status === "requested" || transfer.status === "approved") &&
                          (transferCapabilities.requestCreate || transferCapabilities.manage);
                        const canApprove =
                          transfer.status === "requested" && transferCapabilities.ship;
                        const canShip =
                          transfer.status === "approved" && transferCapabilities.ship;
                        const canReceive =
                          transfer.status === "shipped" &&
                          transferCapabilities.receive &&
                          (transferCapabilities.manage ||
                            transfer.to_location_id === defaultLocation?.location_id);
                        const menuItems: Array<{
                          label: string;
                          icon: ReactNode;
                          onSelect: () => void;
                          tone?: "neutral" | "danger";
                          disabled: boolean;
                        }> = [];

                        menuItems.push({
                          label: "Ver detalle",
                          icon: <Eye className="h-3.5 w-3.5" />,
                          onSelect: () => router.push(`/transferencias/${transfer.transfer_id}`),
                          disabled: false,
                        });

                        if (canApprove) {
                          menuItems.push({
                            label: "Aprobar",
                            icon:
                              approvingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              ),
                            onSelect: () => void handleApproveTransfer(transfer.transfer_id),
                            disabled:
                              approvingId === transfer.transfer_id ||
                              shippingId === transfer.transfer_id ||
                              cancellingId === transfer.transfer_id,
                          });
                        }

                        if (canShip) {
                          menuItems.push({
                            label: "Despachar",
                            icon:
                              shippingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <SendHorizonal className="h-3.5 w-3.5" />
                              ),
                            onSelect: () => setPendingShipTransfer(transfer),
                            disabled:
                              approvingId === transfer.transfer_id ||
                              shippingId === transfer.transfer_id ||
                              cancellingId === transfer.transfer_id,
                          });
                        }

                        if (canReceive) {
                          menuItems.push({
                            label: "Recepcionar",
                            icon:
                              receivingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ),
                            onSelect: () => setPendingReceiveTransfer(transfer),
                            disabled:
                              approvingId === transfer.transfer_id ||
                              shippingId === transfer.transfer_id ||
                              cancellingId === transfer.transfer_id ||
                              receivingId === transfer.transfer_id,
                          });
                        }

                        if (canCancel) {
                          menuItems.push({
                            label: "Cancelar",
                            icon:
                              cancellingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              ),
                            onSelect: () => setPendingCancelTransfer(transfer),
                            tone: "danger",
                            disabled:
                              approvingId === transfer.transfer_id ||
                              shippingId === transfer.transfer_id ||
                              cancellingId === transfer.transfer_id,
                          });
                        }

                        return (
                          <tr
                            key={transfer.transfer_id}
                            className="transition hover:bg-[var(--ops-surface-muted)]"
                          >
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <Link
                                href={`/transferencias/${transfer.transfer_id}`}
                                className="inline-flex rounded-md text-sm font-semibold text-[var(--ops-text)] transition hover:text-[var(--ripnel-accent-hover)]"
                              >
                                {transfer.transfer_number || "Sin numero"}
                              </Link>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <p className="text-sm text-[var(--ops-text)]">
                                {transfer.from_location_name}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {transfer.from_location_code}
                              </p>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <p className="text-sm text-[var(--ops-text)]">
                                {transfer.to_location_name}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {transfer.to_location_code}
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
                            <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm tabular-nums text-[var(--ops-text)]">
                              {transfer.line_count}
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                              {transfer.qty_requested_total}
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {formatDateTime(transfer.created_at)}
                              </p>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              {menuItems.length > 0 ? (
                                <AdminRowActionsMenu
                                  items={menuItems}
                                  ariaLabel="Acciones de transferencia"
                                />
                              ) : transfer.status === "shipped" ? (
                                <div className="flex justify-end">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]">
                                    <Truck className="h-3 w-3" />
                                    Por recepcionar
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-end">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--ops-text-muted)]">
                                    {transfer.status === "requested" ? (
                                      <ClipboardList className="h-3 w-3" />
                                    ) : (
                                      <ArrowRightLeft className="h-3 w-3" />
                                    )}
                                    {transfer.status === "received"
                                      ? "Completada"
                                      : transfer.status === "approved"
                                        ? "Por despachar"
                                        : "Seguimiento"}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </OpsTableWrap>

            {notice ? <AdminInlineMessage tone="success">{notice}</AdminInlineMessage> : null}

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
        open={Boolean(pendingShipTransfer)}
        title="Despachar transferencia"
        description={
          pendingShipTransfer ? (
            <>
              Se despachará la transferencia{" "}
              <strong>{pendingShipTransfer.transfer_number || "sin numero"}</strong> y quedará
              lista para recepción en destino.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Despachar transferencia"
        confirmTone="accent"
        busy={Boolean(
          pendingShipTransfer && shippingId === pendingShipTransfer.transfer_id
        )}
        onCancel={() => setPendingShipTransfer(null)}
        onConfirm={() => {
          if (pendingShipTransfer) {
            void handleShipTransfer(pendingShipTransfer.transfer_id);
            setPendingShipTransfer(null);
          }
        }}
      />

      <AdminConfirmModal
        open={Boolean(pendingCancelTransfer)}
        title="Cancelar transferencia"
        description={
          pendingCancelTransfer ? (
            <>
              Se cancelará la transferencia{" "}
              <strong>{pendingCancelTransfer.transfer_number || "sin numero"}</strong>.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Cancelar transferencia"
        confirmTone="danger"
        busy={Boolean(
          pendingCancelTransfer && cancellingId === pendingCancelTransfer.transfer_id
        )}
        onCancel={() => setPendingCancelTransfer(null)}
        onConfirm={() => {
          if (pendingCancelTransfer) {
            void handleCancelTransfer(pendingCancelTransfer.transfer_id);
            setPendingCancelTransfer(null);
          }
        }}
      />

      <AdminConfirmModal
        open={Boolean(pendingReceiveTransfer)}
        title="Confirmar recepción"
        description={
          pendingReceiveTransfer ? (
            <>
              Se confirmará la recepción de la transferencia{" "}
              <strong>{pendingReceiveTransfer.transfer_number || "sin numero"}</strong> y el
              stock ingresará en destino.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Recepcionar transferencia"
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
