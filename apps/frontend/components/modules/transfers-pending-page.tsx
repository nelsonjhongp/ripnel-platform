"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDateTime,
  type TransferSummary,
} from "./transfers-shared";

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

export function TransfersPendingPage() {
  const { loading: authLoading, permissions, user } = useAuth();
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [receivingId, setReceivingId] = useState<string | null>(null);

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
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar recepciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransfers();
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
  }, [transfers, query]);

  const totals = useMemo(() => {
    return {
      pendingTransfers: filteredTransfers.length,
      pendingUnits: filteredTransfers.reduce(
        (acc, transfer) => acc + transfer.qty_shipped_total,
        0
      ),
    };
  }, [filteredTransfers]);

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
    <div className="sales-page px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
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
                    onClick={() => loadTransfers()}
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
          <MetricPill label="Pendientes" value={totals.pendingTransfers} tone="accent" />
          <MetricPill label="Unidades" value={totals.pendingUnits} tone="warning" />
        </div>

        <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
          <div className="grid gap-2.5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por numero, origen o destino"
                className="sales-field h-10 w-full rounded-lg py-2 pl-9 pr-3 text-sm"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setQuery("")}
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

          {loading ? (
            <div className="ops-empty-state-compact flex items-center justify-center gap-2 rounded-xl px-4 py-10 text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando recepciones pendientes...
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
              {transfers.length === 0
                ? "No hay transferencias pendientes de recepcion."
                : "No existen recepciones para los filtros seleccionados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px] border-y border-[var(--ops-border-strong)]">
                <div className="sales-panel-muted grid grid-cols-[0.84fr_1.2fr_0.78fr_0.78fr_0.9fr] gap-x-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  <div>Numero</div>
                  <div>Ruta</div>
                  <div>Enviada</div>
                  <div className="text-right">Unidades</div>
                  <div className="text-right">Accion</div>
                </div>

                <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {filteredTransfers.map((transfer) => (
                    <div
                      key={transfer.transfer_id}
                      className="grid grid-cols-[0.84fr_1.2fr_0.78fr_0.78fr_0.9fr] gap-x-2 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <div className="flex items-center min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {transfer.transfer_number || "Sin numero"}
                        </p>
                      </div>

                      <div className="flex items-center min-w-0">
                        <p className="truncate text-sm text-[var(--ops-text)]">
                          {transfer.from_location_name}{" "}
                          <span className="text-[var(--ops-text-muted)]">&rarr;</span>{" "}
                          {transfer.to_location_name}
                        </p>
                      </div>

                      <div className="flex items-center text-xs text-[var(--ops-text-muted)]">
                        {formatDateTime(transfer.shipped_at)}
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-2.5 py-1 text-xs font-semibold text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]">
                          <Truck className="h-3 w-3" />
                          {transfer.qty_shipped_total}
                        </span>
                      </div>

                      <div className="flex items-center justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() => handleReceiveTransfer(transfer.transfer_id)}
                                disabled={receivingId === transfer.transfer_id}
                                className="rounded-full px-3.5"
                              >
                                {receivingId === transfer.transfer_id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1.5">Confirmar recepcion</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Confirmar recepcion de esta transferencia</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
