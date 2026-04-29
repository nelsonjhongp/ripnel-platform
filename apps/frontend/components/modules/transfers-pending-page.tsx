"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, LoaderCircle, Search, Truck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import {
  formatDateTime,
  type TransferSummary,
} from "./transfers-shared";

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
      await apiFetch(
        `/api/transfers/${transferId}/receive`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

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

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando recepciones"
        description="Estamos validando la sede activa y los permisos para confirmar ingresos pendientes."
      />
    );
  }

  if (!transferCapabilities.receive) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            Recepcion operativa
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Recepciones pendientes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirma ingresos en destino para cerrar la transferencia y registrar
            el movimiento de entrada.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Transferencias por recepcionar
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.pendingTransfers}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              Unidades pendientes
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">
              {totals.pendingUnits}
            </p>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por numero, origen o destino"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando recepciones...
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredTransfers.map((transfer) => (
                <div
                  key={transfer.transfer_id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {transfer.transfer_number || "Sin numero"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {transfer.from_location_name} ({transfer.from_location_code})
                        {" -> "}
                        {transfer.to_location_name} ({transfer.to_location_code})
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Enviada: {formatDateTime(transfer.shipped_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                        <Truck className="mr-2 inline h-4 w-4" />
                        {transfer.qty_shipped_total} unidades
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReceiveTransfer(transfer.transfer_id)}
                        disabled={receivingId === transfer.transfer_id}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {receivingId === transfer.transfer_id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4 w-4" />
                        )}
                        Confirmar recepcion
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !filteredTransfers.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No hay transferencias pendientes de recepcion.
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
