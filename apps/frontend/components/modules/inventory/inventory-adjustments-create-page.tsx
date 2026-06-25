"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  Check,
  ClipboardList,
  FileText,
  LoaderCircle,
  Package,
  PackagePlus,
  Settings2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { OpsPanelSection } from "@/components/ui/ops-panel-section";
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { PresetTextField } from "@/components/ui/preset-text-field";
import { SearchablePicker } from "@/components/ui/searchable-picker";
import { apiFetchData } from "@/lib/api";
import { appRoutes, buildAdjustmentDetailRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";
import { ADJ } from "./adjustments-messages";
import {
  INFO_BOX_MUTED,
  INPUT_CLASS,
  DIFF_POSITIVE,
  DIFF_NEGATIVE,
  DIFF_ZERO,
} from "./adjustments-constants";
import {
  type AdjustmentDetailData,
  type AdjustmentListData,
  type AdjustmentIntent,
  type AdjustmentVariant,
  type AdjustmentVariantsData,
  buildAdjustmentReason,
  type DraftAdjustmentLine,
  formatAdjustmentIntent,
  groupAdjustmentVariantsByStyle,
  type GroupedAdjustmentStyle,
} from "./inventory-adjustments-shared";

const ADJUSTMENT_REASON_PRESETS: readonly string[] = [
  ADJ.create.motivoPresets.conteoFisico,
  ADJ.create.motivoPresets.merma,
  ADJ.create.motivoPresets.regularizacion,
  ADJ.create.motivoPresets.auditoria,
  ADJ.create.motivoPresets.cargaInicial,
];

const NOTES_MAX = 200;

export function InventoryAdjustmentsCreatePage() {
  const router = useRouter();
  const { user } = useAuth();

  const initialSearchParams =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);

  const canManageAdjustments = ["ADMIN", "ALMACEN"].includes(
    String(user?.role_name || "").toUpperCase()
  );

  // ── Config ──
  const [createLocationId, setCreateLocationId] = useState(
    () => initialSearchParams.get("location_id") || ""
  );
  const [adjustmentIntent, setAdjustmentIntent] = useState<AdjustmentIntent>("adjustment");
  const [createReason, setCreateReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [locations, setLocations] = useState<AdjustmentListData["meta"]["available_locations"]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // ── Variant search ──
  const [variantQuery, setVariantQuery] = useState(
    () => initialSearchParams.get("query") || ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [variantResults, setVariantResults] = useState<AdjustmentVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<GroupedAdjustmentStyle | null>(null);

  // ── Draft lines ──
  const [draftLines, setDraftLines] = useState<DraftAdjustmentLine[]>([]);

  // ── Submit state ──
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [savedAdjustmentId, setSavedAdjustmentId] = useState<string | null>(null);
  const [savedAdjustmentNumber, setSavedAdjustmentNumber] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ── Load locations ──
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await apiFetchData<AdjustmentListData>(
          "/api/inventory/adjustments",
          { cache: "no-store" }
        );
        if (active) setLocations(data?.meta?.available_locations || []);
      } catch {
        if (active) setLocations([]);
      } finally {
        if (active) setLoadingLocations(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  // ── Auto-select default location ──
  const locationAutoSet = useRef(false);

  useEffect(() => {
    if (locationAutoSet.current || loadingLocations || !locations.length) return;
    if (createLocationId && locations.some((l) => l.location_id === createLocationId)) return;

    const defaultLoc = locations.find((l) => l.is_default) || locations[0];
    if (defaultLoc) {
      locationAutoSet.current = true;
      setCreateLocationId(defaultLoc.location_id);
    }
  }, [loadingLocations, locations, createLocationId]);

  // ── Effective location ──
  const effectiveCreateLocationId =
    createLocationId && locations.some((l) => l.location_id === createLocationId)
      ? createLocationId
      : "";

  const selectedCreateLocation = useMemo(
    () => locations.find((l) => l.location_id === effectiveCreateLocationId) ?? null,
    [effectiveCreateLocationId, locations]
  );

  const locationOptions: OpsOption[] = useMemo(
    () =>
      locations.map((l) => ({
        value: l.location_id,
        label: l.name,
        badge: l.is_default ? "Actual" : undefined,
        tone: l.is_default ? ("accent" as const) : undefined,
      })),
    [locations]
  );

  // ── Resolve effective reason ──
  const effectiveReason = useMemo(
    () => buildAdjustmentReason(adjustmentIntent, createReason),
    [createReason, adjustmentIntent]
  );

  // ── Debounced variant search ──
  useEffect(() => {
    const normalizedQuery = variantQuery.trim();
    if (!effectiveCreateLocationId || normalizedQuery.length < 2) {
      setVariantResults([]);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      setLoadingVariants(true);

      try {
        const params = new URLSearchParams({
          location_id: effectiveCreateLocationId,
          query: normalizedQuery,
        });
        const data = await apiFetchData<AdjustmentVariantsData>(
          `/api/inventory/adjustment-variants?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (active) setVariantResults(data?.rows || []);
      } catch {
        if (active && !controller.signal.aborted) setVariantResults([]);
      } finally {
        if (active) setLoadingVariants(false);
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [effectiveCreateLocationId, variantQuery]);

  // ── Group variants by style, filter out fully-added styles ──
  const groupedStyles = useMemo(
    () => groupAdjustmentVariantsByStyle(variantResults),
    [variantResults]
  );

  const filteredGroupedStyles = useMemo(
    () =>
      groupedStyles.filter((style) =>
        style.variants.some(
          (v) => !draftLines.some((line) => line.variant_id === v.variant_id)
        )
      ),
    [groupedStyles, draftLines]
  );

  // ── Draft line CRUD ──
  const addDraftLine = useCallback((variant: AdjustmentVariant) => {
    setDraftLines((current) => [
      ...current,
      { ...variant, counted_qty: variant.system_qty },
    ]);
    setCreateError(null);
    setSavedAdjustmentId(null);
    setSavedAdjustmentNumber(null);
  }, []);

  const removeDraftLine = useCallback((variantId: string) => {
    setDraftLines((current) => current.filter((l) => l.variant_id !== variantId));
    setSavedAdjustmentId(null);
    setSavedAdjustmentNumber(null);
  }, []);

  const updateCountedQty = useCallback((variantId: string, rawValue: string) => {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) return line;
        const parsed = Number(rawValue);
        if (!Number.isInteger(parsed) || parsed < 0) return { ...line, counted_qty: 0 };
        return { ...line, counted_qty: parsed };
      })
    );
    setSavedAdjustmentId(null);
    setSavedAdjustmentNumber(null);
  }, []);

  // ── Derived totals ──
  const draftTotals = useMemo(() => {
    const totalSystem = draftLines.reduce((acc, l) => acc + l.system_qty, 0);
    const totalCounted = draftLines.reduce((acc, l) => acc + l.counted_qty, 0);
    const totalDiff = totalCounted - totalSystem;
    const noChange = draftLines.filter((l) => l.counted_qty === l.system_qty).length;
    const withDiff = draftLines.filter((l) => l.counted_qty !== l.system_qty).length;
    return { lines: draftLines.length, totalSystem, totalCounted, totalDiff, noChange, withDiff };
  }, [draftLines]);

  // ── Lines with differences (for review dialog) ──
  const linesWithDiff = useMemo(
    () => draftLines.filter((l) => l.counted_qty !== l.system_qty),
    [draftLines]
  );

  // ── Save draft ──
  const saveDraft = useCallback(async () => {
    if (!effectiveCreateLocationId) {
      setCreateError(ADJ.validation.locationRequired);
      return null;
    }
    if (!draftLines.length) {
      setCreateError(ADJ.validation.linesRequired);
      return null;
    }

    setSaving(true);
    setCreateError(null);

    try {
      const data = await apiFetchData<AdjustmentDetailData>(
        "/api/inventory/adjustments",
        {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({
            location_id: effectiveCreateLocationId,
            reason: effectiveReason,
            notes: createNotes.trim() || null,
            lines: draftLines.map((line) => ({
              variant_id: line.variant_id,
              counted_qty: line.counted_qty,
              notes: null,
            })),
          }),
        }
      );

      const id = data.adjustment.adjustment_id;
      const number = data.adjustment.adjustment_number;
      setSavedAdjustmentId(id);
      setSavedAdjustmentNumber(number);
      showSuccess(ADJ.toast.draftSaved);
      return { adjustmentId: id, adjustmentNumber: number };
    } catch (err) {
      const message = err instanceof Error ? err.message : ADJ.toast.draftCreateError;
      setCreateError(message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [effectiveCreateLocationId, draftLines, effectiveReason, createNotes]);

  // ── Confirm adjustment ──
  const handleConfirm = useCallback(async () => {
    const targetId = savedAdjustmentId;
    if (!targetId) return;

    setConfirming(true);

    try {
      await apiFetchData<AdjustmentDetailData>(
        `/api/inventory/adjustments/${targetId}/confirm`,
        { method: "POST", body: JSON.stringify({}), cache: "no-store" }
      );
      setConfirmOpen(false);
      showSuccess(ADJ.toast.confirmed);
      router.push(buildAdjustmentDetailRoute(targetId));
    } catch (err) {
      const message = err instanceof Error ? err.message : ADJ.dialog.confirmError;
      showError(message);
    } finally {
      setConfirming(false);
    }
  }, [savedAdjustmentId, router]);

  const handleSaveAndStay = useCallback(async () => {
    await saveDraft();
  }, [saveDraft]);

  const handleOpenConfirm = useCallback(async () => {
    setCreateError(null);
    if (!savedAdjustmentId || !savedAdjustmentNumber) {
      const result = await saveDraft();
      if (!result) return;
    }
    setConfirmOpen(true);
  }, [savedAdjustmentId, savedAdjustmentNumber, saveDraft]);

  if (!canManageAdjustments) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={ADJ.header.eyebrow}
        title={ADJ.header.createTitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
              <Link href={appRoutes.inventoryAdjustments}>
                <ArrowLeft className="h-4 w-4" />
                {ADJ.header.backToList}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-5 grid gap-5 border-t border-[var(--ops-border-soft)] pt-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] xl:items-start">
        {/* ═══════════ LEFT COLUMN ═══════════ */}
        <div className="min-w-0 space-y-4">
          {/* ── Config section (Sede + Tipo only) ── */}
          <OpsPanelSection
            title={ADJ.create.configSection}
            icon={<Settings2 className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <OpsSelect
                label={ADJ.create.locationLabel}
                value={effectiveCreateLocationId}
                onValueChange={(v) => {
                  setCreateLocationId(v);
                  setSavedAdjustmentId(null);
                  setSavedAdjustmentNumber(null);
                }}
                placeholder={ADJ.create.locationPlaceholder}
                options={locationOptions}
                disabled={loadingLocations}
              />
              <OpsSelect
                label={ADJ.create.intentLabel}
                value={adjustmentIntent}
                onValueChange={(v) => {
                  setAdjustmentIntent(v as AdjustmentIntent);
                  setSavedAdjustmentId(null);
                  setSavedAdjustmentNumber(null);
                }}
                options={[
                  {
                    value: "adjustment",
                    label: formatAdjustmentIntent("adjustment"),
                    helper: ADJ.create.intentAdjustmentHelper,
                  },
                  {
                    value: "opening",
                    label: formatAdjustmentIntent("opening"),
                    helper: ADJ.create.intentOpeningHelper,
                  },
                ]}
              />
            </div>
          </OpsPanelSection>

          {/* ── Variants section ── */}
          <OpsPanelSection
            title={ADJ.create.variantsSection}
            icon={<Package className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <SearchablePicker
              value={variantQuery}
              onChange={(v) => {
                setVariantQuery(v);
                setHighlightedIndex(0);
                setSelectedStyle(null);
              }}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              items={filteredGroupedStyles}
              loading={loadingVariants}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
              getItemKey={(s) => s.styleId}
              renderItem={(s) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {s.styleName}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                      {s.styleCode}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--ops-text-muted)]">
                    {s.variants.length} vars · Stock {s.totalSystemQty}
                  </span>
                </div>
              )}
              onSelect={(style) => {
                setSelectedStyle(style);
              }}
              closeOnSelect={false}
              density="compact"
              disabled={!effectiveCreateLocationId}
              placeholder={ADJ.create.searchPlaceholder}
              minQueryLength={2}
              emptyStateMode="query"
              emptyMessage={ADJ.create.noResults}
              loadingMessage={ADJ.create.searching}
              onClear={() => {
                setVariantQuery("");
                setVariantResults([]);
                setHighlightedIndex(0);
                setSelectedStyle(null);
              }}
            />

            {/* ── Sub-panel: variants of selected style ── */}
            {selectedStyle ? (
              <div className="mt-4 space-y-3 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {selectedStyle.styleName}
                    </p>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      {selectedStyle.styleCode} · {selectedStyle.variants.length} variantes · Stock {selectedStyle.totalSystemQty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setSelectedStyle(null)}
                    >
                      Cerrar
                    </Button>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        for (const v of selectedStyle.variants) {
                          if (!draftLines.some((l) => l.variant_id === v.variant_id)) {
                            addDraftLine(v);
                          }
                        }
                        setSelectedStyle(null);
                      }}
                    >
                      <PackagePlus className="h-4 w-4" />
                      Agregar todas
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[580px] rounded-lg border border-[var(--ops-border-strong)]">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-2.5">Talla / Color</th>
                          <th className="px-4 py-2.5 text-right">Sistema</th>
                          <th className="px-4 py-2.5 text-right">Agregar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {selectedStyle.variants.map((v) => {
                          const alreadyAdded = draftLines.some(
                            (l) => l.variant_id === v.variant_id
                          );
                          return (
                            <tr
                              key={v.variant_id}
                              className={cn(
                                "transition",
                                alreadyAdded
                                  ? "bg-[var(--ops-surface-muted)] opacity-60"
                                  : "hover:bg-[var(--ops-surface-muted)]"
                              )}
                            >
                              <td className="px-4 py-2">
                                <p className="text-sm text-[var(--ops-text)]">
                                  {v.size_code} / {v.color_name}
                                </p>
                                <p className="text-[11px] uppercase text-[var(--ripnel-accent-hover)]">
                                  {v.sku}
                                </p>
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-[var(--ops-text-muted)]">
                                {v.system_qty}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {alreadyAdded ? (
                                  <span className="text-xs text-[var(--ops-text-muted)]">
                                    Agregado
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg"
                                    onClick={() => addDraftLine(v)}
                                  >
                                    <PackagePlus className="h-3.5 w-3.5" />
                                    Agregar
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </OpsPanelSection>

          {/* ── Draft lines section ── */}
          <OpsPanelSection
            title={ADJ.create.draftSection}
            icon={<ClipboardList className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            aside={
              <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                {formatAdjustmentIntent(adjustmentIntent)}
              </span>
            }
          >
            {draftLines.length > 0 ? (
              <div className="-mx-[var(--ops-panel-padding)] -mb-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px] border-y border-[var(--ops-border-strong)]">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface-muted)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-3">{ADJ.detail.variants}</th>
                          <th className="px-4 py-3 text-right">{ADJ.detail.system}</th>
                          <th className="px-4 py-3 text-right">{ADJ.detail.counted}</th>
                          <th className="px-4 py-3 text-right">{ADJ.detail.difference}</th>
                          <th className="px-4 py-3 text-right">
                            <span className="sr-only">Quitar</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {draftLines.map((line) => {
                          const diff = line.counted_qty - line.system_qty;
                          return (
                            <tr
                              key={line.variant_id}
                              className="transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              <td className="px-4 py-[var(--ops-row-py)]">
                                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                  {line.style_name}
                                </p>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                  {line.sku}
                                </p>
                                <p className="text-xs text-[var(--ops-text-muted)]">
                                  {line.style_code} · {line.size_code} / {line.color_name}
                                </p>
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                                {line.system_qty}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right">
                                <OpsQuantityStepper
                                  layout="horizontal"
                                  size="sm"
                                  value={line.counted_qty}
                                  onDecrement={() =>
                                    updateCountedQty(
                                      line.variant_id,
                                      String(Math.max(0, line.counted_qty - 1))
                                    )
                                  }
                                  onIncrement={() =>
                                    updateCountedQty(
                                      line.variant_id,
                                      String(line.counted_qty + 1)
                                    )
                                  }
                                  min={0}
                                  className={diff !== 0 ? "ring-1 ring-[var(--ops-tone-warning-text)]" : undefined}
                                />
                              </td>
                              <td
                                className={cn(
                                  "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                                  diff > 0
                                    ? DIFF_POSITIVE
                                    : diff < 0
                                      ? DIFF_NEGATIVE
                                      : DIFF_ZERO
                                )}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => removeDraftLine(line.variant_id)}
                                  className="rounded-lg text-[var(--ops-text-muted)] hover:text-[var(--ops-tone-danger-text)]"
                                  aria-label={ADJ.create.removeAria}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--ops-text-muted)]">
                {ADJ.create.emptyDraft}
              </p>
            )}
          </OpsPanelSection>
        </div>

        {/* ═══════════ RIGHT COLUMN (sidebar) ═══════════ */}
        <aside className="space-y-4 xl:sticky xl:top-20">
          {/* ── Resumen ── */}
          <OpsPanelSection
            title={ADJ.create.summary}
            icon={<Calculator className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <div className="space-y-2">
              <OpsMetricRow
                label={ADJ.metrics.systemTotal}
                value={String(draftTotals.totalSystem)}
              />
              <OpsMetricRow
                label={ADJ.metrics.countedTotal}
                value={String(draftTotals.totalCounted)}
              />
              <OpsMetricRow
                label={ADJ.metrics.difference}
                value={`${draftTotals.totalDiff > 0 ? "+" : ""}${draftTotals.totalDiff}`}
                tone={draftTotals.totalDiff !== 0 ? "warning" : "default"}
              />
              <div className="border-t border-[var(--ops-border-soft)] pt-2">
                <OpsMetricRow
                  label={ADJ.metrics.linesNoChange}
                  value={String(draftTotals.noChange)}
                />
                <OpsMetricRow
                  label={ADJ.metrics.linesWithDiff}
                  value={String(draftTotals.withDiff)}
                />
              </div>
            </div>
          </OpsPanelSection>

          {/* ── Motivo y notas ── */}
          <OpsPanelSection
            title={ADJ.create.motivoSection}
            icon={<FileText className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <div className="space-y-3">
              <PresetTextField
                value={createReason}
                onChange={setCreateReason}
                presets={ADJUSTMENT_REASON_PRESETS}
                placeholder={ADJ.create.customReasonPlaceholder}
                textareaRows={2}
                textareaClassName="min-h-[72px]"
              />

              <OpsFormField label={ADJ.create.notesLabel} density="compact">
                <div className="relative">
                  <textarea
                    value={createNotes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= NOTES_MAX) setCreateNotes(val);
                    }}
                    rows={2}
                    placeholder={ADJ.create.notesPlaceholder}
                    className={`${INPUT_CLASS} min-h-[60px] resize-none pr-12`}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[var(--ops-text-muted)]">
                    {ADJ.create.notesCounter(createNotes.length, NOTES_MAX)}
                  </span>
                </div>
              </OpsFormField>
            </div>
          </OpsPanelSection>

          {/* ── Error ── */}
          {createError ? (
            <InlineStatusCard
              title={ADJ.create.createError}
              description={createError}
              tone="danger"
              variant="ops"
            />
          ) : null}

          {/* ── CTAs ── */}
          <div className="space-y-2">
            <Button
              type="button"
              variant={savedAdjustmentId ? "outline" : "outline"}
              size="sm"
              className="w-full rounded-lg"
              disabled={
                saving || !effectiveCreateLocationId || !draftLines.length || savedAdjustmentId !== null
              }
              onClick={handleSaveAndStay}
            >
              {saving ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADJ.create.saving}
                </>
              ) : savedAdjustmentId ? (
                <>
                  <Check className="h-4 w-4" />
                  {ADJ.create.savedDraft}
                </>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4" />
                  {ADJ.create.saveDraft}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="accent"
              size="sm"
              className="w-full rounded-lg"
              disabled={
                saving || confirming || !effectiveCreateLocationId || !draftLines.length
              }
              onClick={handleOpenConfirm}
            >
              {confirming ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADJ.dialog.confirming}
                </>
              ) : (
                ADJ.dialog.confirmButton
              )}
            </Button>
          </div>
        </aside>
      </div>

      {/* ── Confirm dialog (full review) ── */}
      <OpsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={ADJ.dialog.confirmTitle}
        description={
          savedAdjustmentNumber && selectedCreateLocation
            ? ADJ.dialog.reviewInfo(
                savedAdjustmentNumber,
                selectedCreateLocation.name,
                formatAdjustmentIntent(adjustmentIntent)
              )
            : ADJ.dialog.confirmTitle
        }
        size="lg"
        bodyClassName="space-y-4"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setConfirmOpen(false)}
              disabled={confirming}
            >
              {ADJ.dialog.close}
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADJ.dialog.confirming}
                </>
              ) : (
                ADJ.dialog.confirmButton
              )}
            </Button>
          </div>
        }
      >
        {/* Motivo + Notas summary */}
        <div className={INFO_BOX_MUTED}>
          <p className="text-sm font-medium text-[var(--ops-text)]">
            {effectiveReason || ADJ.list.emptyReason}
          </p>
          {createNotes.trim() ? (
            <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">
              {createNotes}
            </p>
          ) : null}
        </div>

        {/* Lines table (differences only) */}
        {linesWithDiff.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[var(--ops-border-strong)]">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-2.5">{ADJ.detail.variants}</th>
                  <th className="px-4 py-2.5 text-right">{ADJ.detail.system}</th>
                  <th className="px-4 py-2.5 text-right">{ADJ.detail.counted}</th>
                  <th className="px-4 py-2.5 text-right">{ADJ.detail.difference}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {linesWithDiff.map((line) => {
                  const diff = line.counted_qty - line.system_qty;
                  return (
                    <tr key={line.variant_id}>
                      <td className="px-4 py-2">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {line.style_name}
                        </p>
                        <p className="truncate text-[11px] text-[var(--ops-text-muted)]">
                          {line.sku} · {line.size_code} / {line.color_name}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-[var(--ops-text-muted)]">
                        {line.system_qty}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-[var(--ops-text)]">
                        {line.counted_qty}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right text-sm font-semibold tabular-nums",
                          diff > 0
                            ? DIFF_POSITIVE
                            : diff < 0
                              ? DIFF_NEGATIVE
                              : DIFF_ZERO
                        )}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Totals */}
        <div className="space-y-1.5">
          <OpsMetricRow
            label={ADJ.metrics.systemTotal}
            value={String(draftTotals.totalSystem)}
          />
          <OpsMetricRow
            label={ADJ.metrics.countedTotal}
            value={String(draftTotals.totalCounted)}
          />
          <OpsMetricRow
            label={ADJ.metrics.difference}
            value={`${draftTotals.totalDiff > 0 ? "+" : ""}${draftTotals.totalDiff}`}
            tone={draftTotals.totalDiff !== 0 ? "warning" : "default"}
          />
          <div className="border-t border-[var(--ops-border-soft)] pt-1.5">
            <OpsMetricRow
              label={ADJ.metrics.lines}
              value={String(draftTotals.lines)}
            />
            <OpsMetricRow
              label={ADJ.metrics.linesWithDiff}
              value={String(draftTotals.withDiff)}
              tone={draftTotals.withDiff > 0 ? "warning" : "default"}
            />
          </div>
        </div>

        {/* Impact warning */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-[13px] text-[var(--ops-tone-danger-text)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ADJ.dialog.reviewImpact}</span>
        </div>
      </OpsDialog>
    </OpsPageShell>
  );
}
