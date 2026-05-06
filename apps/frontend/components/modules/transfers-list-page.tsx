"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  SendHorizonal,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
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
  type TransferStatus,
  type TransferSummary,
} from "./transfers-shared";

const STATUS_OPTIONS: Array<"all" | TransferStatus> = [
  "all",
  "draft",
  "shipped",
  "received",
  "cancelled",
];

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning";
}) {
  const toneBorder =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))]"
        : "border-[var(--ops-border-strong)]";
  const toneBg =
    tone === "accent"
      ? "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))]"
        : "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))]";
  const toneLabel =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
        : "text-[var(--ops-text-muted)]";
  const toneValue =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneBorder,
        toneBg
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", toneLabel)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", toneValue)}>{value}</span>
    </div>
  );
}

export function TransfersListPage() {
  const { loading: authLoading, permissions, user } = useAuth();
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransferStatus>("all");
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    loadTransfers();
  }, []);

  async function handleShipTransfer(transferId: string) {
    setShippingId(transferId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/transfers/${transferId}/ship`, {
        method: "POST",
        body: JSON.stringify({}),
      });
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

  const filteredTransfers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const matchesStatus =
        statusFilter === "all" || transfer.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        (transfer.transfer_number || "").toLowerCase().includes(normalizedQuery) ||
        transfer.from_location_code.toLowerCase().includes(normalizedQuery) ||
        transfer.from_location_name.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_code.toLowerCase().includes(normalizedQuery) ||
        transfer.to_location_name.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [transfers, query, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: filteredTransfers.length,
      drafts: filteredTransfers.filter((t) => t.status === "draft").length,
      shipped: filteredTransfers.filter((t) => t.status === "shipped").length,
      requestedUnits: filteredTransfers.reduce((acc, t) => acc + t.qty_requested_total, 0),
    };
  }, [filteredTransfers]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransfers = filteredTransfers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const firstVisible = filteredTransfers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastVisible = Math.min(safePage * pageSize, filteredTransfers.length);

  function handleFilterChange(fn: () => void) {
    fn();
    setCurrentPage(1);
  }

  const hasActiveFilters = query !== "" || statusFilter !== "all";

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando seguimiento de transferencias"
        description="Validando capacidades visibles para mostrar solicitudes y movimientos entre tiendas."
      />
    );
  }

  if (!transferCapabilities.visible) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <div className="sales-page px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PosHeader
          eyebrow="Seguimiento operativo"
          title="Transferencias"
          actions={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => loadTransfers()}
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
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="Total" value={totals.total} tone="accent" />
          <MetricPill label="Borradores" value={totals.drafts} />
          <MetricPill label="Enviadas" value={totals.shipped} tone="warning" />
          <MetricPill label="Unidades" value={totals.requestedUnits} />
        </div>

        <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
          <div className="grid gap-2.5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
                placeholder="Buscar por numero, origen o destino"
                className="sales-field h-10 w-full rounded-lg py-2 pl-9 pr-3 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleFilterChange(() => setStatusFilter(status))}
                  className="ops-progress-button inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                  data-active={statusFilter === status ? "true" : undefined}
                >
                  {status === "all" ? "Todas" : formatTransferStatus(status)}
                </button>
              ))}
            </div>

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
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
            >
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-xl border border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]">
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div className="ops-empty-state-compact flex items-center justify-center gap-2 rounded-xl px-4 py-10 text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando transferencias...
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
              {transfers.length === 0
                ? "No existen transferencias registradas."
                : "No existen transferencias para los filtros seleccionados."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[960px] border-y border-[var(--ops-border-strong)]">
                  <div className="sales-panel-muted grid grid-cols-[0.84fr_0.78fr_0.78fr_0.62fr_0.44fr_0.56fr_0.78fr_0.8fr] gap-x-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                    <div>Numero</div>
                    <div>Origen</div>
                    <div>Destino</div>
                    <div>Estado</div>
                    <div className="text-right">Lineas</div>
                    <div className="text-right">Solicitado</div>
                    <div>Creada</div>
                    <div className="text-right">Accion</div>
                  </div>

                  <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {paginatedTransfers.map((transfer) => (
                      <div
                        key={transfer.transfer_id}
                        className="grid grid-cols-[0.84fr_0.78fr_0.78fr_0.62fr_0.44fr_0.56fr_0.78fr_0.8fr] gap-x-2 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <div className="flex items-center min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                            {transfer.transfer_number || "Sin numero"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--ops-text)]">
                            {transfer.from_location_name}
                          </p>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {transfer.from_location_code}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--ops-text)]">
                            {transfer.to_location_name}
                          </p>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {transfer.to_location_code}
                          </p>
                        </div>

                        <div className="flex items-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                              getTransferStatusClasses(transfer.status)
                            )}
                          >
                            {formatTransferStatus(transfer.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-end text-sm tabular-nums text-[var(--ops-text)]">
                          {transfer.line_count}
                        </div>

                        <div className="flex items-center justify-end text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                          {transfer.qty_requested_total}
                        </div>

                        <div className="flex items-center text-xs text-[var(--ops-text-muted)]">
                          {formatDateTime(transfer.created_at)}
                        </div>

                        <div className="flex items-center justify-end gap-1.5">
                          {transfer.status === "draft" ? (
                            <>
                              {(transferCapabilities.requestCreate || transferCapabilities.manage) && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon-sm"
                                        onClick={() => handleCancelTransfer(transfer.transfer_id)}
                                        disabled={shippingId === transfer.transfer_id || cancellingId === transfer.transfer_id}
                                        className="rounded-lg text-[color:color-mix(in_srgb,#e11d48_75%,var(--ops-text))] border-[color:color-mix(in_srgb,#e11d48_30%,var(--ops-border-strong))]"
                                        aria-label="Cancelar transferencia"
                                      >
                                        {cancellingId === transfer.transfer_id ? (
                                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <X className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancelar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {transferCapabilities.ship && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon-sm"
                                        onClick={() => handleShipTransfer(transfer.transfer_id)}
                                        disabled={shippingId === transfer.transfer_id || cancellingId === transfer.transfer_id}
                                        className="rounded-lg"
                                        aria-label="Enviar transferencia"
                                      >
                                        {shippingId === transfer.transfer_id ? (
                                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <SendHorizonal className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Enviar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {!transferCapabilities.ship && !(transferCapabilities.requestCreate || transferCapabilities.manage) && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--ops-text-muted)]">
                                  <ClipboardList className="h-3 w-3" />
                                  Seguimiento
                                </span>
                              )}
                            </>
                          ) : transfer.status === "shipped" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-2.5 py-1 text-xs font-semibold text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]">
                              <Truck className="h-3 w-3" />
                              Pendiente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--ops-text-muted)]">
                              <ArrowRightLeft className="h-3 w-3" />
                              {formatTransferStatus(transfer.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                <span className="ops-secondary-text text-[var(--ops-text-muted)]">
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
