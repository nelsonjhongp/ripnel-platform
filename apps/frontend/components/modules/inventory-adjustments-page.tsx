"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Boxes,
  ClipboardList,
  Eye,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Search,
  SquareCheckBig,
  Trash2,
  X,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

type Location = {
  location_id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  active: boolean;
};

type AdjustmentStatus = "draft" | "confirmed" | "cancelled";

type AdjustmentSummary = {
  adjustment_id: string;
  adjustment_number: string;
  location_id: string;
  location_code: string;
  location_name: string;
  status: AdjustmentStatus;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  line_count: number;
};

type AdjustmentLine = {
  adjustment_line_id: string;
  adjustment_id: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
  counted_qty: number;
  difference_qty: number;
  notes: string | null;
};

type AdjustmentDetail = AdjustmentSummary & {
  lines: AdjustmentLine[];
};

type AdjustmentVariant = {
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
};

type DraftAdjustmentLine = AdjustmentVariant & {
  counted_qty: number;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload.data;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  return "Borrador";
}

function getStatusClasses(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function getDifferenceClasses(value: number) {
  if (value > 0) {
    return "text-emerald-700";
  }

  if (value < 0) {
    return "text-rose-700";
  }

  return "text-slate-600";
}

export function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [createLocationId, setCreateLocationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftAdjustmentLine[]>([]);
  const [variantQuery, setVariantQuery] = useState("");
  const [variantResults, setVariantResults] = useState<AdjustmentVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantSearchError, setVariantSearchError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdjustmentDetail | null>(null);
  const [confirmingAdjustment, setConfirmingAdjustment] = useState(false);
  const [cancellingAdjustment, setCancellingAdjustment] = useState(false);

  async function loadAdjustments() {
    setLoadingAdjustments(true);
    setError(null);

    try {
      const data = await requestJson<AdjustmentSummary[]>("/api/inventory/adjustments");
      setAdjustments(data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar ajustes"
      );
    } finally {
      setLoadingAdjustments(false);
    }
  }

  async function loadLocations() {
    setLoadingLocations(true);

    try {
      const data = await requestJson<Location[]>("/api/locations");
      setLocations((data || []).filter((location) => location.active));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar sedes"
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    void loadAdjustments();
    void loadLocations();
  }, []);

  useEffect(() => {
    if (!createOpen || !createLocationId) {
      setVariantResults([]);
      setVariantSearchError(null);
      setLoadingVariants(false);
      return;
    }

    const normalizedQuery = variantQuery.trim();

    if (normalizedQuery.length < 2) {
      setVariantResults([]);
      setVariantSearchError(null);
      setLoadingVariants(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingVariants(true);
      setVariantSearchError(null);

      try {
        const params = new URLSearchParams({
          location_id: createLocationId,
          query: normalizedQuery,
        });
        const data = await requestJson<AdjustmentVariant[]>(
          `/api/inventory/adjustment-variants?${params.toString()}`,
          { signal: controller.signal }
        );
        setVariantResults(data || []);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setVariantSearchError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo buscar variantes"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingVariants(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [createLocationId, createOpen, variantQuery]);

  const filteredAdjustments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adjustments.filter((adjustment) => {
      const matchesStatus =
        statusFilter === "all" || adjustment.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || adjustment.location_id === locationFilter;
      const matchesQuery =
        !normalizedQuery ||
        adjustment.adjustment_number.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_code.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_name.toLowerCase().includes(normalizedQuery) ||
        (adjustment.reason || "").toLowerCase().includes(normalizedQuery) ||
        (adjustment.created_by_name || "").toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesLocation && matchesQuery;
    });
  }, [adjustments, locationFilter, query, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: adjustments.length,
      drafts: adjustments.filter((adjustment) => adjustment.status === "draft").length,
      confirmed: adjustments.filter((adjustment) => adjustment.status === "confirmed")
        .length,
    };
  }, [adjustments]);

  const filteredVariantResults = useMemo(() => {
    return variantResults.filter(
      (variant) =>
        !draftLines.some((line) => line.variant_id === variant.variant_id)
    );
  }, [draftLines, variantResults]);

  function openCreateModal() {
    setCreateOpen(true);
    setCreateLocationId("");
    setCreateReason("");
    setCreateNotes("");
    setDraftLines([]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
    setLoadingVariants(false);
    setNotice(null);
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setCreateLocationId("");
    setCreateReason("");
    setCreateNotes("");
    setDraftLines([]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
    setLoadingVariants(false);
  }

  function addDraftLine(variant: AdjustmentVariant) {
    setDraftLines((current) => [
      ...current,
      {
        ...variant,
        counted_qty: variant.system_qty,
      },
    ]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
  }

  function removeDraftLine(variantId: string) {
    setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
  }

  function updateCountedQty(variantId: string, rawValue: string) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) {
          return line;
        }

        const parsed = Number(rawValue);

        if (!Number.isInteger(parsed) || parsed < 0) {
          return {
            ...line,
            counted_qty: 0,
          };
        }

        return {
          ...line,
          counted_qty: parsed,
        };
      })
    );
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdjustment(true);
    setError(null);
    setNotice(null);

    try {
      if (!createLocationId) {
        throw new Error("Debes seleccionar una sede");
      }

      if (!draftLines.length) {
        throw new Error("Debes agregar al menos una variante");
      }

      await requestJson<AdjustmentDetail>("/api/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({
          location_id: createLocationId,
          reason: createReason.trim() || null,
          notes: createNotes.trim() || null,
          lines: draftLines.map((line) => ({
            variant_id: line.variant_id,
            counted_qty: line.counted_qty,
            notes: null,
          })),
        }),
      });

      closeCreateModal();
      setNotice("Ajuste guardado en borrador.");
      await loadAdjustments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el ajuste"
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  async function openDetail(adjustmentId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    try {
      const data = await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${adjustmentId}`
      );
      setDetail(data);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el detalle"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
  }

  async function confirmAdjustment() {
    if (!detail) {
      return;
    }

    setConfirmingAdjustment(true);
    setDetailError(null);
    setError(null);
    setNotice(null);

    try {
      await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${detail.adjustment_id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      closeDetail();
      setNotice("Ajuste confirmado y aplicado al inventario.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo confirmar el ajuste"
      );
    } finally {
      setConfirmingAdjustment(false);
    }
  }

  async function cancelAdjustment() {
    if (!detail) {
      return;
    }

    setCancellingAdjustment(true);
    setDetailError(null);
    setError(null);
    setNotice(null);

    try {
      await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${detail.adjustment_id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      closeDetail();
      setNotice("Ajuste cancelado.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cancelar el ajuste"
      );
    } finally {
      setCancellingAdjustment(false);
    }
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            Apertura y regularizacion
          </p>
          <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                Apertura y ajustes
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Crea borradores de conteo, confirma ajustes y deja trazabilidad
                real en inventario y kardex.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <PackagePlus className="h-4 w-4" />
              Nuevo ajuste
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total ajustes
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.total}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              Borradores
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{totals.drafts}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Confirmados
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{totals.confirmed}</p>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por numero, sede, motivo o usuario"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">Todas las sedes</option>
              {locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {(["all", "draft", "confirmed", "cancelled"] as const).map((status) => (
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
                  {status === "all" ? "Todos" : formatStatus(status)}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {loadingAdjustments || loadingLocations ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando ajustes...
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
                      Sede
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Motivo
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lineas
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Creado
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAdjustments.map((adjustment) => (
                    <tr key={adjustment.adjustment_id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        {adjustment.adjustment_number}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-violet-500" />
                          {adjustment.location_name}
                        </span>
                        <p className="text-xs text-slate-500">{adjustment.location_code}</p>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            adjustment.status
                          )}`}
                        >
                          {formatStatus(adjustment.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {adjustment.reason || "Sin motivo"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">
                        {adjustment.line_count}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {formatDateTime(adjustment.created_at)}
                        <p className="text-xs text-slate-500">
                          {adjustment.created_by_name || "Sistema"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        <button
                          type="button"
                          onClick={() => void openDetail(adjustment.adjustment_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingAdjustments && !filteredAdjustments.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No hay ajustes para los filtros actuales.
            </div>
          ) : null}
        </article>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Boxes className="h-4 w-4" />
              Apertura inicial
            </p>
            <p className="mt-2 text-sm text-violet-800">
              Si una variante existe pero aun no tuvo stock en una sede, aqui se
              puede registrar el conteo inicial con <code>system_qty = 0</code>.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClipboardList className="h-4 w-4" />
              Regla operativa
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Guardar un borrador no toca stock. El cambio recien impacta
              inventario y kardex cuando el ajuste se confirma.
            </p>
          </article>
        </div>

        {createOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Nuevo ajuste</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Crea un borrador de apertura, conteo o regularizacion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>

              <form
                onSubmit={submitAdjustment}
                className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"
              >
                <article className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-slate-700">Sede</span>
                      <select
                        value={createLocationId}
                        onChange={(event) => {
                          setCreateLocationId(event.target.value);
                          setDraftLines([]);
                          setVariantQuery("");
                          setVariantResults([]);
                          setVariantSearchError(null);
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="">Selecciona una sede</option>
                        {locations.map((location) => (
                          <option key={location.location_id} value={location.location_id}>
                            {location.code} - {location.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-slate-700">Motivo</span>
                      <input
                        type="text"
                        value={createReason}
                        onChange={(event) => setCreateReason(event.target.value)}
                        placeholder="Apertura inicial, conteo, regularizacion..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Notas</span>
                    <textarea
                      value={createNotes}
                      onChange={(event) => setCreateNotes(event.target.value)}
                      rows={3}
                      placeholder="Detalle adicional del conteo o apertura"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Buscar variantes</p>
                    <p className="mt-1 text-sm text-slate-500">
                      El buscador usa la sede elegida y tambien devuelve variantes con
                      stock actual en cero.
                    </p>

                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={variantQuery}
                        onChange={(event) => setVariantQuery(event.target.value)}
                        disabled={!createLocationId}
                        placeholder={
                          createLocationId
                            ? "Buscar por SKU, style, talla o color"
                            : "Primero selecciona una sede"
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100"
                      />
                    </div>

                    {variantSearchError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {variantSearchError}
                      </div>
                    ) : null}

                    {loadingVariants ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Buscando variantes...
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      {filteredVariantResults.map((variant) => (
                        <div
                          key={variant.variant_id}
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_120px]"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {variant.style_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {variant.sku} - {variant.style_code} - {variant.size_code} /{" "}
                              {variant.color_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Sistema actual:{" "}
                              <span className="font-semibold">{variant.system_qty}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => addDraftLine(variant)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
                          >
                            <PackagePlus className="h-4 w-4" />
                            Agregar
                          </button>
                        </div>
                      ))}

                      {!loadingVariants &&
                      createLocationId &&
                      variantQuery.trim().length >= 2 &&
                      !filteredVariantResults.length ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                          No se encontraron variantes para esa busqueda.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Lineas del ajuste</p>
                      <p className="text-sm text-slate-500">
                        {draftLines.length} variantes agregadas
                      </p>
                    </div>
                    <span className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                      Draft
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {draftLines.map((line) => {
                      const difference = line.counted_qty - line.system_qty;

                      return (
                        <div
                          key={line.variant_id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {line.style_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {line.sku} - {line.size_code} / {line.color_name}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDraftLine(line.variant_id)}
                              className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-rose-600"
                              aria-label="Quitar linea"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                              Sistema:{" "}
                              <span className="font-semibold">{line.system_qty}</span>
                            </div>
                            <label className="space-y-1 text-sm">
                              <span className="font-medium text-slate-700">Conteo</span>
                              <input
                                type="number"
                                min={0}
                                value={line.counted_qty}
                                onChange={(event) =>
                                  updateCountedQty(line.variant_id, event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              />
                            </label>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                              <span className="text-slate-600">Diferencia: </span>
                              <span className={`font-semibold ${getDifferenceClasses(difference)}`}>
                                {difference > 0 ? "+" : ""}
                                {difference}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!draftLines.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        Aun no agregas variantes al ajuste.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={savingAdjustment || !createLocationId || !draftLines.length}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {savingAdjustment ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4" />
                    )}
                    Guardar borrador
                  </button>
                </article>
              </form>
            </div>
          </div>
        ) : null}

        {detailOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Detalle de ajuste</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Revisa lineas, diferencias y confirma el documento cuando este listo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>

              {detailError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {detailError}
                </div>
              ) : null}

              {detailLoading ? (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando detalle...
                </div>
              ) : detail ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Numero</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {detail.adjustment_number}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Sede</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {detail.location_name}
                      </p>
                      <p className="text-sm text-slate-500">{detail.location_code}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                      <p className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            detail.status
                          )}`}
                        >
                          {formatStatus(detail.status)}
                        </span>
                      </p>
                    </article>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Cabecera</p>
                      <dl className="mt-3 space-y-2 text-sm text-slate-600">
                        <div>
                          <dt className="font-medium text-slate-700">Motivo</dt>
                          <dd>{detail.reason || "Sin motivo"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-700">Notas</dt>
                          <dd>{detail.notes || "Sin notas"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-700">Creado</dt>
                          <dd>
                            {formatDateTime(detail.created_at)} -{" "}
                            {detail.created_by_name || "Sistema"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-700">Confirmado</dt>
                          <dd>
                            {detail.confirmed_at
                              ? `${formatDateTime(detail.confirmed_at)} - ${
                                  detail.confirmed_by_name || "Sistema"
                                }`
                              : "Pendiente"}
                          </dd>
                        </div>
                      </dl>
                    </article>

                    <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                      <p className="text-sm font-semibold text-violet-700">Impacto esperado</p>
                      <p className="mt-2 text-sm text-violet-800">
                        Al confirmar, cada linea ajusta la cantidad final de la sede y
                        genera un movimiento <code>ADJUST</code> en kardex.
                      </p>
                    </article>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Variante
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Sistema
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Conteo
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Diferencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {detail.lines.map((line) => (
                          <tr key={line.adjustment_line_id} className="hover:bg-slate-50">
                            <td className="px-3 py-3 text-sm">
                              <p className="font-semibold text-slate-900">{line.style_name}</p>
                              <p className="text-xs text-slate-500">
                                {line.sku} - {line.style_code} - {line.size_code} /{" "}
                                {line.color_name}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-right text-sm text-slate-700">
                              {line.system_qty}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">
                              {line.counted_qty}
                            </td>
                            <td
                              className={`px-3 py-3 text-right text-sm font-semibold ${getDifferenceClasses(
                                line.difference_qty
                              )}`}
                            >
                              {line.difference_qty > 0 ? "+" : ""}
                              {line.difference_qty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                    {detail.status === "draft" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void cancelAdjustment()}
                          disabled={confirmingAdjustment || cancellingAdjustment}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancellingAdjustment ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Cancelar ajuste
                        </button>
                        <button
                          type="button"
                          onClick={() => void confirmAdjustment()}
                          disabled={confirmingAdjustment || cancellingAdjustment}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {confirmingAdjustment ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <SquareCheckBig className="h-4 w-4" />
                          )}
                          Confirmar ajuste
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
