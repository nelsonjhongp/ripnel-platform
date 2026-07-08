"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, PackagePlus, ShieldAlert, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { PresetTextField } from "@/components/ui/preset-text-field";
import { SearchablePicker } from "@/components/ui/searchable-picker";
import { WORKSPACE_SECTION_CLASS } from "@/components/ui/ops-control-styles";
import { apiFetchData } from "@/lib/api";
import { appRoutes, buildAdjustmentDetailRoute } from "@/lib/routes";
import { showError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { AdjustmentSummaryStage } from "./adjustment-summary-stage";
import {
  DIFF_NEGATIVE,
  DIFF_POSITIVE,
  DIFF_ZERO,
  INFO_BOX_MUTED,
  INPUT_CLASS,
} from "./adjustments-constants";
import { ADJ } from "./adjustments-messages";
import {
  buildAdjustmentReason,
  formatAdjustmentIntent,
  groupAdjustmentVariantsByStyle,
  type AdjustmentDetailData,
  type AdjustmentIntent,
  type AdjustmentListData,
  type AdjustmentVariant,
  type AdjustmentVariantsData,
  type DraftAdjustmentLine,
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

type AdjustmentActionState = "idle" | "saving_draft" | "reviewing" | "confirming";

export function InventoryAdjustmentsCreatePage() {
  const router = useRouter();
  const { user, defaultLocation } = useAuth();

  const initialSearchParams =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);

  const canManageAdjustments = ["ADMIN", "ALMACEN"].includes(
    String(user?.role_name || "").toUpperCase()
  );
  const canChangeLocation = ["ADMIN", "ALMACEN"].includes(
    String(user?.role_name || "").toUpperCase()
  );

  const [createLocationId, setCreateLocationId] = useState(
    () => initialSearchParams.get("location_id") || ""
  );
  const [adjustmentIntent, setAdjustmentIntent] = useState<AdjustmentIntent>("adjustment");
  const [createReason, setCreateReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [locations, setLocations] = useState<AdjustmentListData["meta"]["available_locations"]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [variantQuery, setVariantQuery] = useState(
    () => initialSearchParams.get("query") || ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [variantResults, setVariantResults] = useState<AdjustmentVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<GroupedAdjustmentStyle | null>(null);

  const [draftLines, setDraftLines] = useState<DraftAdjustmentLine[]>([]);

  const [actionState, setActionState] = useState<AdjustmentActionState>("idle");
  const [errors, setErrors] = useState<{ _form?: string; location_id?: string; lines?: string }>({});
  const [savedAdjustmentId, setSavedAdjustmentId] = useState<string | null>(null);
  const [savedAdjustmentNumber, setSavedAdjustmentNumber] = useState<string | null>(null);
  const [staleDraftNumber, setStaleDraftNumber] = useState<string | null>(null);
  const [reviewAutoSaved, setReviewAutoSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await apiFetchData<AdjustmentListData>("/api/inventory/adjustments", {
          cache: "no-store",
        });
        if (active) setLocations(data?.meta?.available_locations || []);
      } catch {
        if (active) setLocations([]);
      } finally {
        if (active) setLoadingLocations(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const defaultCreateLocationId = useMemo(
    () => locations.find((location) => location.is_default)?.location_id || locations[0]?.location_id || "",
    [locations]
  );

  const effectiveCreateLocationId =
    createLocationId && locations.some((location) => location.location_id === createLocationId)
      ? createLocationId
      : defaultCreateLocationId;

  const selectedCreateLocation = useMemo(
    () => locations.find((location) => location.location_id === effectiveCreateLocationId) ?? null,
    [effectiveCreateLocationId, locations]
  );

  const locationOptions: OpsOption[] = useMemo(
    () =>
      locations.map((location) => ({
        value: location.location_id,
        label: location.name,
        badge: location.is_default ? ADJ.create.defaultLocationBadge : undefined,
        tone: location.is_default ? ("accent" as const) : undefined,
      })),
    [locations]
  );

  const effectiveReason = useMemo(
    () => buildAdjustmentReason(adjustmentIntent, createReason),
    [adjustmentIntent, createReason]
  );

  const normalizedVariantQuery = variantQuery.trim();
  const canSearchVariants =
    effectiveCreateLocationId.length > 0 && normalizedVariantQuery.length >= 2;

  useEffect(() => {
    if (!canSearchVariants) return;

    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      setLoadingVariants(true);

      try {
        const params = new URLSearchParams({
          location_id: effectiveCreateLocationId,
          query: normalizedVariantQuery,
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
  }, [canSearchVariants, effectiveCreateLocationId, normalizedVariantQuery]);

  const visibleVariantResults = useMemo(
    () => (canSearchVariants ? variantResults : []),
    [canSearchVariants, variantResults]
  );

  const groupedStyles = useMemo(
    () => groupAdjustmentVariantsByStyle(visibleVariantResults),
    [visibleVariantResults]
  );

  const filteredGroupedStyles = useMemo(
    () =>
      groupedStyles.filter((style) =>
        style.variants.some(
          (variant) => !draftLines.some((line) => line.variant_id === variant.variant_id)
        )
      ),
    [draftLines, groupedStyles]
  );

  const clearFormError = useCallback(() => {
    setErrors((current) => (current._form ? { ...current, _form: undefined } : current));
  }, []);

  const resetSavedDraft = useCallback(() => {
    setStaleDraftNumber((current) => current || savedAdjustmentNumber);
    setSavedAdjustmentId(null);
    setSavedAdjustmentNumber(null);
    setReviewAutoSaved(false);
    setConfirmOpen(false);
    setActionState("idle");
  }, [savedAdjustmentNumber]);

  const isSavingDraft = actionState === "saving_draft";
  const isReviewing = actionState === "reviewing";
  const isConfirming = actionState === "confirming";
  const hasPersistedDraft = Boolean(savedAdjustmentId && savedAdjustmentNumber);
  const hasBlockingAction = isSavingDraft || isConfirming;
  const selectedStyleAvailableCount = selectedStyle
    ? selectedStyle.variants.filter(
        (variant) => !draftLines.some((line) => line.variant_id === variant.variant_id)
      ).length
    : 0;

  const documentStatusCard = useMemo(() => {
    if (hasPersistedDraft && savedAdjustmentNumber) {
      return {
        title: ADJ.create.draftStatusTitle,
        description: reviewAutoSaved
          ? ADJ.create.draftStatusAutoSaved(savedAdjustmentNumber)
          : ADJ.create.draftStatusSaved(savedAdjustmentNumber),
        tone: "neutral" as const,
      };
    }

    if (staleDraftNumber) {
      return {
        title: ADJ.create.draftStatusDirtyTitle,
        description: ADJ.create.draftStatusDirty(staleDraftNumber),
        tone: "warning" as const,
      };
    }

    if (effectiveCreateLocationId && draftLines.length > 0) {
      return {
        title: ADJ.create.readyTitle,
        description: ADJ.create.readyDescription,
        tone: "neutral" as const,
      };
    }

    return {
      title: isSavingDraft || isReviewing ? ADJ.create.localDraftTitle : ADJ.create.pendingTitle,
      description: effectiveCreateLocationId
        ? ADJ.create.pendingLines
        : ADJ.create.pendingLocation,
      tone: "warning" as const,
    };
  }, [
    draftLines.length,
    effectiveCreateLocationId,
    hasPersistedDraft,
    isReviewing,
    isSavingDraft,
    reviewAutoSaved,
    savedAdjustmentNumber,
    staleDraftNumber,
  ]);

  const addDraftLine = useCallback(
    (variant: AdjustmentVariant) => {
      setDraftLines((current) => [...current, { ...variant, counted_qty: variant.system_qty }]);
      clearFormError();
      setErrors((current) => (current.lines ? { ...current, lines: undefined } : current));
      resetSavedDraft();
    },
    [clearFormError, resetSavedDraft]
  );

  const removeDraftLine = useCallback(
    (variantId: string) => {
      setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
      clearFormError();
      resetSavedDraft();
    },
    [clearFormError, resetSavedDraft]
  );

  const updateCountedQty = useCallback(
    (variantId: string, rawValue: string) => {
      setDraftLines((current) =>
        current.map((line) => {
          if (line.variant_id !== variantId) return line;
          const parsed = Number(rawValue);
          if (!Number.isInteger(parsed) || parsed < 0) return { ...line, counted_qty: 0 };
          return { ...line, counted_qty: parsed };
        })
      );
      clearFormError();
      resetSavedDraft();
    },
    [clearFormError, resetSavedDraft]
  );

  const draftTotals = useMemo(() => {
    const totalSystem = draftLines.reduce((acc, line) => acc + line.system_qty, 0);
    const totalCounted = draftLines.reduce((acc, line) => acc + line.counted_qty, 0);
    const totalDiff = totalCounted - totalSystem;
    const noChange = draftLines.filter((line) => line.counted_qty === line.system_qty).length;
    const withDiff = draftLines.filter((line) => line.counted_qty !== line.system_qty).length;
    return { lines: draftLines.length, totalSystem, totalCounted, totalDiff, noChange, withDiff };
  }, [draftLines]);

  const linesWithDiff = useMemo(
    () => draftLines.filter((line) => line.counted_qty !== line.system_qty),
    [draftLines]
  );

  const saveDraft = useCallback(
    async (options?: { silent?: boolean; nextState?: AdjustmentActionState }) => {
      if (!effectiveCreateLocationId) {
        setErrors({ location_id: ADJ.validation.locationRequired });
        return null;
      }
      if (!draftLines.length) {
        setErrors({ lines: ADJ.validation.linesRequired });
        return null;
      }

      setActionState("saving_draft");
      setErrors({});

      try {
        const data = await apiFetchData<AdjustmentDetailData>("/api/inventory/adjustments", {
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
        });

        const id = data.adjustment.adjustment_id;
        const number = data.adjustment.adjustment_number;
        setSavedAdjustmentId(id);
        setSavedAdjustmentNumber(number);
        setStaleDraftNumber(null);
        setReviewAutoSaved(Boolean(options?.silent));

        if (!options?.silent) {
          showSuccess(ADJ.toast.draftSaved);
        }

        setActionState(options?.nextState ?? "idle");
        return { adjustmentId: id, adjustmentNumber: number };
      } catch (err) {
        const message = err instanceof Error ? err.message : ADJ.toast.draftCreateError;
        setErrors({ _form: message });
        setActionState("idle");
        return null;
      }
    },
    [createNotes, draftLines, effectiveCreateLocationId, effectiveReason]
  );

  const handleConfirm = useCallback(async () => {
    if (!savedAdjustmentId) return;

    setActionState("confirming");

    try {
      await apiFetchData<AdjustmentDetailData>(
        `/api/inventory/adjustments/${savedAdjustmentId}/confirm`,
        { method: "POST", body: JSON.stringify({}), cache: "no-store" }
      );
      setConfirmOpen(false);
      showSuccess(ADJ.toast.confirmed);
      router.push(buildAdjustmentDetailRoute(savedAdjustmentId));
    } catch (err) {
      const message = err instanceof Error ? err.message : ADJ.dialog.confirmError;
      showError(message);
    } finally {
      setActionState("reviewing");
    }
  }, [router, savedAdjustmentId]);

  const handleSaveAndStay = useCallback(async () => {
    clearFormError();
    setReviewAutoSaved(false);
    await saveDraft();
  }, [clearFormError, saveDraft]);

  const handleOpenConfirm = useCallback(async () => {
    clearFormError();

    if (!savedAdjustmentId || !savedAdjustmentNumber) {
      const result = await saveDraft({ silent: true, nextState: "reviewing" });
      if (!result) return;
    } else {
      setReviewAutoSaved(false);
      setActionState("reviewing");
    }

    setConfirmOpen(true);
  }, [clearFormError, saveDraft, savedAdjustmentId, savedAdjustmentNumber]);

  const handleConfirmOpenChange = useCallback(
    (open: boolean) => {
      setConfirmOpen(open);
      if (!open && actionState !== "confirming") {
        setActionState("idle");
      }
    },
    [actionState]
  );

  if (!canManageAdjustments) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={ADJ.header.eyebrow}
        title={ADJ.header.createTitle}
        actions={
          <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
            <Link href={appRoutes.inventoryAdjustments}>
              <ArrowLeft className="h-4 w-4" />
              {ADJ.header.backToList}
            </Link>
          </Button>
        }
      />

      <div className="mt-5 grid gap-5 border-t border-[var(--ops-border-soft)] pt-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <section className={WORKSPACE_SECTION_CLASS}>
            <OpsStepSectionHeading step={1} title={ADJ.create.configSection} />

            <div className="grid gap-4 sm:grid-cols-2">
              <OpsFormField
                label={ADJ.create.locationLabel}
                error={errors.location_id}
                density="compact"
              >
                <OpsSelect
                  value={effectiveCreateLocationId}
                  onValueChange={(value) => {
                    setCreateLocationId(value);
                    clearFormError();
                    resetSavedDraft();
                    setErrors((current) => ({
                      ...current,
                      _form: undefined,
                      location_id: undefined,
                    }));
                  }}
                  placeholder={ADJ.create.locationPlaceholder}
                  options={locationOptions}
                  disabled={
                    loadingLocations ||
                    hasBlockingAction ||
                    (!canChangeLocation && Boolean(defaultLocation?.location_id))
                  }
                />
              </OpsFormField>

              <OpsFormField label={ADJ.create.intentLabel} density="compact">
                <OpsSelect
                  value={adjustmentIntent}
                  onValueChange={(value) => {
                    setAdjustmentIntent(value as AdjustmentIntent);
                    resetSavedDraft();
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
                  disabled={hasBlockingAction}
                />
              </OpsFormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {ADJ.create.motivoLabel}
                </p>
                <PresetTextField
                  value={createReason}
                  onChange={(value) => {
                    setCreateReason(value);
                    resetSavedDraft();
                  }}
                  presets={ADJUSTMENT_REASON_PRESETS}
                  placeholder={ADJ.create.customReasonPlaceholder}
                  textareaRows={1}
                  textareaClassName="min-h-[56px]"
                  disabled={hasBlockingAction}
                />
              </div>

              <OpsFormField
                label={ADJ.create.notesLabel}
                optionalLabel={ADJ.create.notesOptionalLabel}
                density="compact"
              >
                <div className="relative">
                  <textarea
                    value={createNotes}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value.length <= NOTES_MAX) {
                        setCreateNotes(value);
                        resetSavedDraft();
                      }
                    }}
                    rows={2}
                    placeholder={ADJ.create.notesPlaceholder}
                    className={`${INPUT_CLASS} min-h-[72px] resize-none pr-12`}
                    disabled={hasBlockingAction}
                  />
                  {createNotes.length > 0 ? (
                    <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-[var(--ops-text-muted)]">
                      {ADJ.create.notesCounter(createNotes.length, NOTES_MAX)}
                    </span>
                  ) : null}
                </div>
              </OpsFormField>
            </div>
          </section>

          <section className={WORKSPACE_SECTION_CLASS}>
            <OpsStepSectionHeading
              step={2}
              title={ADJ.create.variantsSection}
            />

            <SearchablePicker
              value={variantQuery}
              onChange={(value) => {
                setVariantQuery(value);
                setHighlightedIndex(0);
                setSelectedStyle(null);
                clearFormError();
              }}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              items={filteredGroupedStyles}
              loading={loadingVariants}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
              getItemKey={(style) => style.styleId}
              renderItem={(style) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {style.styleName}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                      {style.styleCode}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--ops-text-muted)]">
                    {ADJ.create.searchResultCounts(style.variants.length, style.totalSystemQty)}
                  </span>
                </div>
              )}
              onSelect={(style) => {
                setSelectedStyle(style);
              }}
              closeOnSelect={false}
              density="compact"
              disabled={!effectiveCreateLocationId || hasBlockingAction}
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
                clearFormError();
              }}
            />

            {selectedStyle ? (
              <div className="mt-4 space-y-3 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {selectedStyle.styleName}
                    </p>
                    <p className="text-xs text-[var(--ops-text-muted)]">
                      {ADJ.create.subpanelMeta(
                        selectedStyle.styleCode,
                        selectedStyle.variants.length,
                        selectedStyle.totalSystemQty
                      )}
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
                      {ADJ.create.closeSubpanel}
                    </Button>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        for (const variant of selectedStyle.variants) {
                          if (!draftLines.some((line) => line.variant_id === variant.variant_id)) {
                            addDraftLine(variant);
                          }
                        }
                      }}
                      disabled={selectedStyleAvailableCount === 0}
                    >
                      <PackagePlus className="h-4 w-4" />
                      {ADJ.create.addAll}
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[580px] rounded-lg border border-[var(--ops-border-strong)]">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-2.5">{ADJ.create.variantTable.sizeColor}</th>
                          <th className="px-4 py-2.5 text-right">{ADJ.create.variantTable.system}</th>
                          <th className="px-4 py-2.5 text-right">{ADJ.create.variantTable.action}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {selectedStyle.variants.map((variant) => {
                          const alreadyAdded = draftLines.some(
                            (line) => line.variant_id === variant.variant_id
                          );

                          return (
                            <tr
                              key={variant.variant_id}
                              className={cn(
                                "transition",
                                alreadyAdded
                                  ? "bg-[var(--ops-surface-muted)] opacity-60"
                                  : "hover:bg-[var(--ops-surface-muted)]"
                              )}
                            >
                              <td className="px-4 py-2">
                                <p className="text-sm text-[var(--ops-text)]">
                                  {variant.size_code} / {variant.color_name}
                                </p>
                                <p className="text-[11px] uppercase text-[var(--ripnel-accent-hover)]">
                                  {variant.sku}
                                </p>
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-[var(--ops-text-muted)]">
                                {variant.system_qty}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {alreadyAdded ? (
                                  <span className="text-xs text-[var(--ops-text-muted)]">
                                    {ADJ.create.added}
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg"
                                    onClick={() => addDraftLine(variant)}
                                  >
                                    <PackagePlus className="h-3.5 w-3.5" />
                                    {ADJ.create.addOne}
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
          </section>

          <section className={WORKSPACE_SECTION_CLASS}>
            <OpsStepSectionHeading
              step={3}
              title={ADJ.create.draftSection}
              meta={
                draftLines.length > 0 ? (
                  <span className="text-xs text-[var(--ops-text-muted)]">
                    {ADJ.create.draftMeta(draftTotals.lines, draftTotals.withDiff, draftTotals.noChange)}
                  </span>
                ) : null
              }
            />

            {draftLines.length > 0 ? (
              <div className="-mx-4 overflow-hidden rounded-b-xl sm:-mx-5">
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
          </section>
        </div>

        <aside className="space-y-4">
          {errors._form ? (
            <InlineStatusCard
              title={ADJ.create.createError}
              description={errors._form}
              tone="danger"
              variant="ops"
            />
          ) : null}

          <AdjustmentSummaryStage
            locationLabel={
              selectedCreateLocation?.name ||
              (loadingLocations ? ADJ.locationBadge.loading : ADJ.locationBadge.noLocation)
            }
            intentLabel={formatAdjustmentIntent(adjustmentIntent)}
            reasonLabel={effectiveReason || ADJ.list.emptyReason}
            notesLabel={createNotes.trim() || ADJ.create.summaryNoNotes}
            draftLabel={
              hasPersistedDraft && savedAdjustmentNumber
                ? ADJ.create.summaryDraftSaved(savedAdjustmentNumber)
                : staleDraftNumber
                  ? ADJ.create.summaryDraftSaved(staleDraftNumber)
                  : ADJ.create.summaryDraftPending
            }
            draftStatus={documentStatusCard}
            totals={draftTotals}
            canSaveDraft={
              !hasBlockingAction &&
              Boolean(effectiveCreateLocationId && draftLines.length) &&
              !hasPersistedDraft
            }
            canReview={!hasBlockingAction && Boolean(effectiveCreateLocationId && draftLines.length)}
            isSavingDraft={isSavingDraft}
            isReviewing={isReviewing}
            isConfirming={isConfirming}
            hasPersistedDraft={hasPersistedDraft}
            onSaveDraft={() => {
              void handleSaveAndStay();
            }}
            onReview={() => {
              void handleOpenConfirm();
            }}
          />
        </aside>
      </div>

      <OpsDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
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
              onClick={() => handleConfirmOpenChange(false)}
              disabled={isConfirming}
            >
              {ADJ.dialog.close}
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
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
        {reviewAutoSaved ? (
          <InlineStatusCard
            title={ADJ.create.draftStatusTitle}
            description={ADJ.dialog.reviewAutoSaved}
            variant="ops"
          />
        ) : null}

        <div className={INFO_BOX_MUTED}>
          <div className="space-y-1.5">
            {savedAdjustmentNumber ? (
              <OpsMetricRow label={ADJ.dialog.reviewNumber} value={savedAdjustmentNumber} />
            ) : null}
            {selectedCreateLocation ? (
              <OpsMetricRow label={ADJ.dialog.reviewLocation} value={selectedCreateLocation.name} />
            ) : null}
            <OpsMetricRow
              label={ADJ.dialog.reviewIntent}
              value={formatAdjustmentIntent(adjustmentIntent)}
            />
          </div>
        </div>

        <div className={INFO_BOX_MUTED}>
          <OpsMetricRow
            label={ADJ.dialog.reviewReason}
            value={effectiveReason || ADJ.list.emptyReason}
          />
          {createNotes.trim() ? (
            <div className="mt-2 border-t border-[var(--ops-border-soft)] pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                {ADJ.dialog.reviewNotes}
              </p>
              <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{createNotes}</p>
            </div>
          ) : null}
        </div>

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
                          diff > 0 ? DIFF_POSITIVE : diff < 0 ? DIFF_NEGATIVE : DIFF_ZERO
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

        <div className="space-y-1.5">
          <OpsMetricRow label={ADJ.metrics.systemTotal} value={String(draftTotals.totalSystem)} />
          <OpsMetricRow label={ADJ.metrics.countedTotal} value={String(draftTotals.totalCounted)} />
          <OpsMetricRow
            label={ADJ.metrics.difference}
            value={`${draftTotals.totalDiff > 0 ? "+" : ""}${draftTotals.totalDiff}`}
            tone={draftTotals.totalDiff !== 0 ? "warning" : "default"}
          />
          <div className="border-t border-[var(--ops-border-soft)] pt-1.5">
            <OpsMetricRow label={ADJ.metrics.lines} value={String(draftTotals.lines)} />
            <OpsMetricRow
              label={ADJ.metrics.linesWithDiff}
              value={String(draftTotals.withDiff)}
              tone={draftTotals.withDiff > 0 ? "warning" : "default"}
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-[13px] text-[var(--ops-tone-danger-text)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ADJ.dialog.reviewImpact}</span>
        </div>
      </OpsDialog>
    </OpsPageShell>
  );
}
