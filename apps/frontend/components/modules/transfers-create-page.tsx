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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>({});

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
    setPendingQuantities((current) => ({ ...current, [item.variant_id]: "" }));
  }

  function updateLineQty(variantId: string, rawValue: string) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) return line;
        const nextQty = Number(rawValue);
        if (!Number.isInteger(nextQty) || nextQty <= 0) return { ...line, qty_requested: 1 };
        return { ...line, qty_requested: Math.min(nextQty, line.qty) };
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
      >("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          from_location_id: originId,
          to_location_id: isStoreRequestMode ? defaultLocation?.location_id : destinationId,
          notes: notes.trim() || null,
          lines: draftLines.map((line) => ({
            variant_id: line.variant_id,
            qty_requested: line.qty_requested,
            notes: null,
          })),
        }),
      });
      const data = unwrapApiData(payload);
      setSuccessMessage(
        `${isStoreRequestMode ? "Solicitud" : "Transferencia"} ${data.transfer_number || "creada"} registrada en borrador`
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
        description="Validando tu sede activa y los permisos operativos para este flujo."
      />
    );
  }

  if (!transferCapabilities.requestCreate) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <div className="sales-page px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PosHeader
          eyebrow={isStoreRequestMode ? "Reposicion entre tiendas" : "Traslado interno"}
          title={isStoreRequestMode ? "Solicitar productos" : "Crear transferencia"}
        />

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
          >
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]">
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Origen
                </span>
                <select
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  disabled={loadingLocations}
                  className="sales-field h-10 w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una sede</option>
                  {originOptions.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.code} &mdash; {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  {isStoreRequestMode ? "Mi tienda" : "Destino"}
                </span>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  disabled={loadingLocations || !originId || isStoreRequestMode}
                  className="sales-field h-10 w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una sede</option>
                  {destinationOptions.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.code} &mdash; {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                Notas
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  isStoreRequestMode
                    ? "Que producto falta o por que necesitas la reposicion"
                    : "Motivo operativo del traslado"
                }
                className="sales-field w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="h-4 w-4 text-[var(--ops-text-muted)]" />
                <span className="text-sm font-semibold text-[var(--ops-text)]">
                  Stock disponible en origen
                </span>
              </div>

              {!originId ? (
                <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
                  Selecciona un origen para ver el stock disponible.
                </div>
              ) : loadingInventory ? (
                <div className="ops-empty-state-compact flex items-center justify-center gap-2 rounded-xl px-4 py-10 text-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando stock...
                </div>
              ) : (
                <div className="space-y-2">
                  {availableInventory.map((item) => (
                    <div
                      key={item.variant_id}
                      className="grid gap-2 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-3 md:grid-cols-[1fr_88px_88px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {item.style_name}
                        </p>
                        <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                          {item.sku}
                        </p>
                        <p className="truncate text-xs text-[var(--ops-text-muted)]">
                          {item.size_code} / {item.color_name} &middot; Disponible:{" "}
                          <span className="font-semibold text-[var(--ops-text)]">{item.qty}</span>
                        </p>
                      </div>

                      <input
                        type="number"
                        min={1}
                        max={item.qty}
                        value={pendingQuantities[item.variant_id] || ""}
                        onChange={(e) =>
                          setPendingQuantities((c) => ({
                            ...c,
                            [item.variant_id]: e.target.value,
                          }))
                        }
                        placeholder="Cant."
                        className="sales-field h-9 w-full rounded-lg px-2 py-1 text-sm text-center"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addLine(item)}
                        className="rounded-lg"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="ml-1">Agregar</span>
                      </Button>
                    </div>
                  ))}

                  {originId && !loadingInventory && !availableInventory.length && (
                    <div className="ops-empty-state-compact rounded-xl px-4 py-6 text-center text-sm">
                      No hay stock disponible en el origen seleccionado.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-sm font-semibold text-[var(--ops-text)]">
                    Lineas del traslado
                  </span>
                  <span className="ml-2 text-xs text-[var(--ops-text-muted)]">
                    {totals.lines} lineas &middot; {totals.units} unidades
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-muted)]">
                  <ArrowRightLeft className="h-3 w-3" />
                  Draft
                </span>
              </div>

              {draftLines.length === 0 ? (
                <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
                  Aun no agregas variantes al traslado.
                </div>
              ) : (
                <div className="space-y-2">
                  {draftLines.map((line) => (
                    <div
                      key={line.variant_id}
                      className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                            {line.style_name}
                          </p>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                            {line.sku}
                          </p>
                          <p className="text-xs text-[var(--ops-text-muted)]">
                            {line.size_code} / {line.color_name} &middot; Stock: {line.qty}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLine(line.variant_id)}
                          className="rounded-lg shrink-0 text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                          aria-label="Quitar linea"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <label className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Cantidad
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={line.qty}
                          value={line.qty_requested}
                          onChange={(e) => updateLineQty(line.variant_id, e.target.value)}
                          className="sales-field h-8 w-24 rounded-lg px-2 py-1 text-sm text-center"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  submitting ||
                  loadingLocations ||
                  !originId ||
                  !(isStoreRequestMode ? defaultLocation?.location_id : destinationId) ||
                  !draftLines.length
                }
                variant="accent"
                className="mt-4 w-full rounded-full"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                <span className="ml-2">
                  {isStoreRequestMode ? "Crear solicitud en borrador" : "Crear transferencia en borrador"}
                </span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
