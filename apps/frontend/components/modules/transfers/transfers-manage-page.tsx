"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowRightLeft, Boxes, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ForbiddenPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { useTransferCapabilities } from "@/hooks/use-transfer-capabilities";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import {
  AdminInlineMessage,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import { OpsSelectMenu } from "@/components/ui/ops-selection";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import { useTransferDraft } from "./use-transfer-draft";

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

export function TransfersManagePage() {
  const { loading: authLoading, defaultLocation, permissions, user } = useAuth();
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");

  const transferCapabilities = useTransferCapabilities();

  const { data: locations, loading: loadingLocations } = useApiGet<Location[]>(
    () =>
      apiFetch<ApiEnvelope<Location[]> | Location[]>("/api/locations", {
        cache: "no-store",
      }).then((p) => (unwrapApiData(p) || []).filter((l: Location) => l.active)),
    []
  );

  const { data: inventoryRaw, loading: loadingInventory, refetch: refetchInventory } = useApiGet<InventoryItem[]>(
    originId
      ? () =>
          apiFetch<ApiEnvelope<InventoryItem[]> | InventoryItem[]>(
            `/api/inventory?location_id=${originId}`,
            { cache: "no-store" }
          ).then((p) => (unwrapApiData(p) || []).filter((i: InventoryItem) => i.qty > 0))
      : null,
    [originId]
  );
  const inventory = inventoryRaw ?? [];

  const {
    draftLines,
    pendingQuantities,
    setPendingQuantities,
    notes,
    setNotes,
    error,
    successMessage,
    submitting,
    addLine,
    updateLineQty,
    removeLine,
    submitTransferDraft,
  } = useTransferDraft({
    isStoreRequestMode: false,
    selectedRequestProduct: null,
    originId,
    setOriginId,
    setSelectedRequestProduct: () => {},
    requestQuery: "",
    loadRequestCandidates: async () => {},
    loadInventory: async () => {
      refetchInventory();
    },
  });

  const availableInventory = useMemo(() => {
    return inventory.filter(
      (item) => !draftLines.some((line) => line.variant_id === item.variant_id)
    );
  }, [inventory, draftLines]);

  const destinationOptions = useMemo(() => {
    return (locations || [])
      .filter((location) => location.location_id !== originId)
      .map((location) => ({
        value: location.location_id,
        label: `${location.code} - ${location.name}`,
        helper: location.type,
      }));
  }, [locations, originId]);

  const originOptions = useMemo(() => {
    return (locations || [])
      .filter((location) => location.location_id !== destinationId)
      .map((location) => ({
        value: location.location_id,
        label: `${location.code} - ${location.name}`,
        helper: location.type,
      }));
  }, [destinationId, locations]);

  const totals = useMemo(() => {
    return {
      lines: draftLines.length,
      units: draftLines.reduce((acc, line) => acc + line.qty_requested, 0),
      availableVariants: availableInventory.length,
    };
  }, [availableInventory.length, draftLines]);

  function handleAddLine(item: InventoryItem) {
    addLine(item);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitTransferDraft(originId, destinationId, defaultLocation);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando transferencia"
        description="Validando tu sede activa y los permisos operativos para este flujo."
      />
    );
  }

  if (!transferCapabilities.manage) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
      <TooltipProvider delayDuration={120}>
        <PosHeader
        eyebrow="Transferencias"
        title="Registrar transferencia"
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Lineas" value={totals.lines} tone="accent" />
        <OpsMetricPill label="Unidades" value={totals.units} />
        <OpsMetricPill
          label="Disponibles"
          value={totals.availableVariants}
          tone="warning"
        />
      </div>

      <OpsSectionDivider>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
          {successMessage ? (
            <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
          ) : null}

          <section className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
            <div className="grid gap-4 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Origen
                </label>
                <OpsSelectMenu
                  value={originId}
                  onValueChange={setOriginId}
                  placeholder="Selecciona una sede"
                  options={originOptions}
                  disabled={loadingLocations}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Destino
                </label>
                <OpsSelectMenu
                  value={destinationId}
                  onValueChange={setDestinationId}
                  placeholder="Selecciona una sede"
                  options={destinationOptions}
                  disabled={loadingLocations || !originId}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="transfer-notes"
                  className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
                >
                  Notas
                </label>
                <AdminTextarea
                  id="transfer-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Motivo operativo del traslado"
                  className="min-h-[92px]"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
            <OpsTableBlock>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                      Stock disponible en origen
                    </h2>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      Variantes con stock positivo listas para agregar.
                    </p>
                  </div>
                </div>
              </div>

              <OpsDataTable
                columns={[
                  { key: "variante", header: "Variante" },
                  { key: "detalle", header: "Detalle" },
                  { key: "disponible", header: "Disponible", className: "text-right" },
                  { key: "cantidad", header: "Cantidad" },
                  { key: "agregar", header: "Agregar", className: "text-right" },
                ]}
                minWidth="760px"
                loading={Boolean(originId) && loadingInventory}
                loadingMessage="Cargando stock..."
                emptyMessage={!originId ? "Selecciona un origen para ver el stock disponible." : "No hay stock disponible en el origen seleccionado."}
                isEmpty={!loadingInventory && availableInventory.length === 0}
              >
                {availableInventory.map((item) => (
                  <tr
                    key={item.variant_id}
                    className="transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {item.style_name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                        {item.sku}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                      <p className="truncate">
                        {item.size_code} / {item.color_name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {item.garment_type_name || item.style_code}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                      {item.qty}
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
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
                        className="sales-field h-9 w-24 rounded-lg px-2 py-1 text-center text-sm"
                      />
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddLine(item)}
                        className="rounded-lg px-3"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </Button>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            </OpsTableBlock>

            <OpsTableBlock>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                      Líneas de la transferencia
                    </h2>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      Borrador listo para registrar.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                  Draft
                </span>
              </div>

              <OpsDataTable
                columns={[
                  { key: "variante", header: "Variante" },
                  { key: "stock", header: "Stock", className: "text-right" },
                  { key: "cantidad", header: "Cantidad" },
                  { key: "quitar", header: "Quitar", className: "text-right" },
                ]}
                minWidth="680px"
                emptyMessage="Aún no agregas variantes a la transferencia."
                isEmpty={draftLines.length === 0}
              >
                {draftLines.map((line) => (
                  <tr
                    key={line.variant_id}
                    className="transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {line.style_name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                        {line.sku}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                        {line.size_code} / {line.color_name}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text)]">
                      {line.qty}
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <input
                        type="number"
                        min={1}
                        max={line.qty}
                        value={line.qty_requested}
                        onChange={(event) =>
                          updateLineQty(line.variant_id, event.target.value)
                        }
                        className="sales-field h-9 w-24 rounded-lg px-2 py-1 text-center text-sm"
                      />
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(line.variant_id)}
                        className="rounded-lg text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                        aria-label="Quitar linea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>

              <div className="flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {totals.lines} líneas y {totals.units} unidades en borrador
                </span>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingLocations ||
                    !originId ||
                    !destinationId ||
                    !draftLines.length
                  }
                  variant="accent"
                  className="rounded-lg px-4"
                >
                  {submitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                  Crear transferencia en borrador
                </Button>
              </div>
            </OpsTableBlock>
          </div>
        </form>
      </OpsSectionDivider>
    </TooltipProvider>
    </OpsPageShell>
  );
}
