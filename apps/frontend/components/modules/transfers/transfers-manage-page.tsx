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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import { useTransferDraft } from "./use-transfer-draft";
import { TRANS } from "./transfers-messages";

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
        title={TRANS.pending.preparing}
        description={TRANS.pending.validatingLocation}
      />
    );
  }

  if (!transferCapabilities.manage) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={TRANS.header.eyebrow}
        title={TRANS.header.manageTitle}
      />

      <OpsMetricInlineGroup
        items={[
          { label: TRANS.metrics.lines, value: totals.lines, tone: "accent" },
          { label: TRANS.metrics.units, value: totals.units, tone: "default" },
          { label: TRANS.metrics.available, value: totals.availableVariants, tone: "warning" },
        ]}
      />

      <OpsSectionDivider>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm text-[var(--ops-tone-danger-text)]">
              {error}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-lg border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-4 py-3 text-sm text-[var(--ops-tone-success-text)]">
              {successMessage}
            </div>
          ) : null}

          <section className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
            <div className="grid gap-4 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {TRANS.request.originLabel}
                </label>
                <OpsSelect
                  value={originId}
                  onValueChange={setOriginId}
                  placeholder={TRANS.request.selectOrigin}
                  options={originOptions}
                  disabled={loadingLocations}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {TRANS.request.destinationLabel}
                </label>
                <OpsSelect
                  value={destinationId}
                  onValueChange={setDestinationId}
                  placeholder={TRANS.request.selectDestination}
                  options={destinationOptions}
                  disabled={loadingLocations || !originId}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="transfer-notes"
                  className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
                >
                  {TRANS.manage.notesLabel}
                </label>
                <textarea
                  id="transfer-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder={TRANS.manage.notesPlaceholder}
                  className="min-h-[92px] w-full resize-y rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2 text-sm outline-none"
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
                      {TRANS.manage.stockSection}
                    </h2>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      {TRANS.manage.stockHelp}
                    </p>
                  </div>
                </div>
              </div>

              <OpsTableWrap minWidth="760px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">{TRANS.table.columns.products}</th>
                      <th className="px-4 py-3">Detalle</th>
                      <th className="px-4 py-3 text-right">{TRANS.metrics.available}</th>
                      <th className="px-4 py-3">{TRANS.manage.qtyLabel}</th>
                      <th className="px-4 py-3 text-right">{TRANS.manage.add}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {!originId ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          {TRANS.manage.selectOrigin}
                        </td>
                      </tr>
                    ) : loadingInventory ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                          {TRANS.manage.loadingStock}
                        </td>
                      </tr>
                    ) : availableInventory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          {TRANS.manage.noStock}
                        </td>
                      </tr>
                    ) : (
                      availableInventory.map((item) => (
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
                              placeholder={TRANS.manage.qtyLabel}
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
                              {TRANS.manage.add}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>
            </OpsTableBlock>

            <OpsTableBlock>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                      {TRANS.manage.draftSection}
                    </h2>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      {TRANS.pending.draftReady}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                  Borrador
                </span>
              </div>

              <OpsTableWrap minWidth="680px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">{TRANS.table.columns.products}</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3">{TRANS.manage.qtyLabel}</th>
                      <th className="px-4 py-3 text-right">{TRANS.manage.removeLine}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {draftLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          {TRANS.manage.draftEmpty}
                        </td>
                      </tr>
                    ) : (
                      draftLines.map((line) => (
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
                              className="rounded-lg text-[var(--ops-text-muted)] hover:text-[var(--ops-tone-danger-text)]"
                              aria-label={TRANS.manage.removeLine}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>

              <div className="flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {TRANS.manage.summaryLines(totals.lines, totals.units)}
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
                  {TRANS.manage.createDraft}
                </Button>
              </div>
            </OpsTableBlock>
          </div>
        </form>
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
