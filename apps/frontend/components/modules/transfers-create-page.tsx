"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRightLeft,
  Boxes,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, LoadingPage } from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";

type Location = {
  location_id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
};

type InventoryItem = {
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_code: string;
  color_name: string;
  qty: number;
};

type DraftLine = InventoryItem & {
  qty_requested: number;
};

export function TransfersCreatePage() {
  const { loading: authLoading, defaultLocation, permissions, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>(
    {}
  );

  const transferCapabilities = useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
  );

  const isStoreRequestMode = transferCapabilities.requestCreate && !transferCapabilities.manage;

  async function loadLocations() {
    setLoadingLocations(true);

    try {
      const payload = await apiFetch<ApiEnvelope<Location[]> | Location[]>(
        "/api/locations",
        { cache: "no-store" }
      );
      const data = unwrapApiData(payload);

      setLocations((data || []).filter((location: Location) => location.active));
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

  async function loadInventory(locationId: string) {
    if (!locationId) {
      setInventory([]);
      return;
    }

    setLoadingInventory(true);

    try {
      const payload = await apiFetch<ApiEnvelope<InventoryItem[]> | InventoryItem[]>(
        `/api/inventory?location_id=${locationId}`,
        { cache: "no-store" }
      );
      const data = unwrapApiData(payload);

      setInventory((data || []).filter((item: InventoryItem) => item.qty > 0));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar stock de origen"
      );
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (isStoreRequestMode && defaultLocation?.location_id) {
      setDestinationId(defaultLocation.location_id);
    }
  }, [defaultLocation?.location_id, isStoreRequestMode]);

  useEffect(() => {
    setDraftLines([]);
    setPendingQuantities({});
    setSuccessMessage(null);
    loadInventory(originId);
  }, [originId]);

  const availableInventory = useMemo(() => {
    return inventory.filter(
      (item) => !draftLines.some((line) => line.variant_id === item.variant_id)
    );
  }, [inventory, draftLines]);

  const destinationOptions = useMemo(() => {
    return locations.filter((location) => location.location_id !== originId);
  }, [locations, originId]);

  const originOptions = useMemo(() => {
    const blockedDestinationId = isStoreRequestMode
      ? defaultLocation?.location_id
      : destinationId;

    return locations.filter((location) => location.location_id !== blockedDestinationId);
  }, [defaultLocation?.location_id, destinationId, isStoreRequestMode, locations]);

  const totals = useMemo(() => {
    return {
      lines: draftLines.length,
      units: draftLines.reduce((acc, line) => acc + line.qty_requested, 0),
    };
  }, [draftLines]);

  function addLine(item: InventoryItem) {
    const rawQty = pendingQuantities[item.variant_id] || "";
    const qtyRequested = Number(rawQty);

    if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
      setError("La cantidad solicitada debe ser un entero mayor a cero");
      return;
    }

    if (qtyRequested > item.qty) {
      setError("La cantidad solicitada no puede exceder el stock disponible");
      return;
    }

    setError(null);
    setDraftLines((current) => [...current, { ...item, qty_requested: qtyRequested }]);
    setPendingQuantities((current) => ({
      ...current,
      [item.variant_id]: "",
    }));
  }

  function updateLineQty(variantId: string, rawValue: string) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) {
          return line;
        }

        const nextQty = Number(rawValue);

        if (!Number.isInteger(nextQty) || nextQty <= 0) {
          return {
            ...line,
            qty_requested: 1,
          };
        }

        return {
          ...line,
          qty_requested: Math.min(nextQty, line.qty),
        };
      })
    );
  }

  function removeLine(variantId: string) {
    setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!originId || !(isStoreRequestMode ? defaultLocation?.location_id : destinationId)) {
        throw new Error("Debes seleccionar origen y destino");
      }

      if (!draftLines.length) {
        throw new Error("Debes agregar al menos una variante a la transferencia");
      }

      const payload = await apiFetch<
        ApiEnvelope<{ transfer_number?: string | null }> | { transfer_number?: string | null }
      >(
        "/api/transfers",
        {
          method: "POST",
          body: JSON.stringify({
            from_location_id: originId,
            to_location_id: isStoreRequestMode
              ? defaultLocation?.location_id
              : destinationId,
            notes: notes.trim() || null,
            lines: draftLines.map((line) => ({
              variant_id: line.variant_id,
              qty_requested: line.qty_requested,
              notes: null,
            })),
          }),
        }
      );
      const data = unwrapApiData(payload);

      setSuccessMessage(
        `${
          isStoreRequestMode ? "Solicitud" : "Transferencia"
        } ${data.transfer_number || "creada"} registrada en borrador`
      );
      setDraftLines([]);
      setPendingQuantities({});
      setNotes("");
      await loadInventory(originId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear la transferencia"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando solicitud entre tiendas"
        description="Estamos validando tu sede activa y los permisos operativos para este flujo."
      />
    )
  }

  if (!transferCapabilities.requestCreate) {
    return <ForbiddenPage variant="ops" />
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            {isStoreRequestMode ? "Reposición entre tiendas" : "Traslado interno"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            {isStoreRequestMode ? "Solicitar productos" : "Crear transferencia"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isStoreRequestMode
              ? "Pide productos para tu sede usando stock real de otra tienda u origen disponible."
              : "Arma un borrador de traslado entre sedes usando stock real del origen."}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Origen</span>
                <select
                  value={originId}
                  onChange={(event) => setOriginId(event.target.value)}
                  disabled={loadingLocations}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">Selecciona una sede</option>
                  {originOptions.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.code} - {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">
                  {isStoreRequestMode ? "Mi tienda" : "Destino"}
                </span>
                <select
                  value={destinationId}
                  onChange={(event) => setDestinationId(event.target.value)}
                  disabled={loadingLocations || !originId || isStoreRequestMode}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">Selecciona una sede</option>
                  {destinationOptions.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.code} - {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-medium text-slate-700">Notas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder={
                  isStoreRequestMode
                    ? "Qué producto falta o por qué necesitas la reposición"
                    : "Motivo operativo del traslado"
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Boxes className="h-4 w-4" />
                Stock disponible en origen
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Las variantes aparecen aqui solo si ya tuvieron su primer movimiento
                y tienen stock en la sede elegida.
              </p>

              {loadingInventory ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando stock de origen...
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {availableInventory.map((item) => (
                    <div
                      key={item.variant_id}
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_120px_88px]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.style_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.sku} · {item.style_code} · {item.size_code} /{" "}
                          {item.color_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Disponible: <span className="font-semibold">{item.qty}</span>
                        </p>
                      </div>

                      <input
                        type="number"
                        min={1}
                        max={item.qty}
                        value={pendingQuantities[item.variant_id] || ""}
                        onChange={(event) =>
                          setPendingQuantities((current) => ({
                            ...current,
                            [item.variant_id]: event.target.value,
                          }))
                        }
                        placeholder="Cant."
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />

                      <button
                        type="button"
                        onClick={() => addLine(item)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>
                  ))}

                  {!availableInventory.length && originId ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      No hay stock disponible en el origen seleccionado.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Lineas del traslado
                </p>
                <p className="text-sm text-slate-500">
                  {totals.lines} lineas · {totals.units} unidades
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">
                <ArrowRightLeft className="mr-2 inline h-4 w-4" />
                Draft
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {draftLines.map((line) => (
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
                        {line.sku} · {line.size_code} / {line.color_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.variant_id)}
                      className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-red-600"
                      aria-label="Quitar linea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      Disponible en origen:{" "}
                      <span className="font-semibold">{line.qty}</span>
                    </div>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-slate-700">
                        Cantidad solicitada
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={line.qty}
                        value={line.qty_requested}
                        onChange={(event) =>
                          updateLineQty(line.variant_id, event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </label>
                  </div>
                </div>
              ))}

              {!draftLines.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Aun no agregas variantes al traslado.
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingLocations ||
                !originId ||
                !(isStoreRequestMode ? defaultLocation?.location_id : destinationId) ||
                !draftLines.length
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              {isStoreRequestMode ? "Crear solicitud en borrador" : "Crear transferencia en borrador"}
            </button>
          </article>
        </form>
      </div>
    </section>
  );
}
