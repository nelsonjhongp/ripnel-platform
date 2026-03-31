"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  LoaderCircle,
  Search,
  SendHorizonal,
  Truck,
  X,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
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

export function TransfersListPage() {
  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransferStatus>("all");
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTransfers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/transfers"), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar transferencias");
      }

      setTransfers(payload.data || []);
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
      const response = await fetch(
        buildApiUrl(`/api/transfers/${transferId}/ship`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo enviar la transferencia");
      }

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
      const response = await fetch(
        buildApiUrl(`/api/transfers/${transferId}/cancel`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cancelar la transferencia");
      }

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
      drafts: filteredTransfers.filter((transfer) => transfer.status === "draft")
        .length,
      shipped: filteredTransfers.filter((transfer) => transfer.status === "shipped")
        .length,
      requestedUnits: filteredTransfers.reduce(
        (acc, transfer) => acc + transfer.qty_requested_total,
        0
      ),
    };
  }, [filteredTransfers]);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            Movimiento entre sedes
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Listado de transferencias
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Revisa borradores, transferencias enviadas y recepciones ya cerradas.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Transferencias
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.total}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Borradores
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.drafts}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              Enviadas pendientes
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">
              {totals.shipped}
            </p>
          </article>
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-violet-700">
              Unidades solicitadas
            </p>
            <p className="mt-2 text-2xl font-bold text-violet-800">
              {totals.requestedUnits}
            </p>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
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

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    statusFilter === status
                      ? "border-violet-400 bg-violet-100 text-violet-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {status === "all" ? "Todas" : formatTransferStatus(status)}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando transferencias...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Numero
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Origen
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Destino
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lineas
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Solicitado
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Creada
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.transfer_id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        {transfer.transfer_number || "Sin numero"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {transfer.from_location_name}
                        <p className="text-xs text-slate-500">
                          {transfer.from_location_code}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {transfer.to_location_name}
                        <p className="text-xs text-slate-500">
                          {transfer.to_location_code}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTransferStatusClasses(
                            transfer.status
                          )}`}
                        >
                          {formatTransferStatus(transfer.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-slate-700">
                        {transfer.line_count}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">
                        {transfer.qty_requested_total}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {formatDateTime(transfer.created_at)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        {transfer.status === "draft" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleCancelTransfer(transfer.transfer_id)}
                              disabled={
                                shippingId === transfer.transfer_id ||
                                cancellingId === transfer.transfer_id
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancellingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShipTransfer(transfer.transfer_id)}
                              disabled={
                                shippingId === transfer.transfer_id ||
                                cancellingId === transfer.transfer_id
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {shippingId === transfer.transfer_id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <SendHorizonal className="h-4 w-4" />
                              )}
                              Enviar
                            </button>
                          </div>
                        ) : transfer.status === "shipped" ? (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                            <Truck className="h-4 w-4" />
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                            <ArrowRightLeft className="h-4 w-4" />
                            {formatTransferStatus(transfer.status)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !filteredTransfers.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No existen transferencias para los filtros seleccionados.
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
