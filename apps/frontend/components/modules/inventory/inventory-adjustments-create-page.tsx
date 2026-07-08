"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { type OpsOption } from "@/components/ui/ops-selection";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { apiFetchData } from "@/lib/api";
import { appRoutes, buildAdjustmentDetailRoute } from "@/lib/routes";
import { showError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

import AdjustmentConfigStep from "./AdjustmentConfigStep";
import AdjustmentVariantsStep from "./AdjustmentVariantsStep";
import AdjustmentDraftStep from "./AdjustmentDraftStep";
import { AdjustmentSummaryStage } from "./adjustment-summary-stage";
import {
  DIFF_NEGATIVE,
  DIFF_POSITIVE,
  DIFF_ZERO,
  INFO_BOX_MUTED,
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
          <AdjustmentConfigStep
            locationOptions={locationOptions}
            effectiveCreateLocationId={effectiveCreateLocationId}
            onLocationChange={setCreateLocationId}
            adjustmentIntent={adjustmentIntent}
            onIntentChange={setAdjustmentIntent}
            createReason={createReason}
            onReasonChange={setCreateReason}
            createNotes={createNotes}
            onNotesChange={setCreateNotes}
            loadingLocations={loadingLocations}
            hasBlockingAction={hasBlockingAction}
            canChangeLocation={canChangeLocation}
            defaultLocation={defaultLocation}
            resetSavedDraft={resetSavedDraft}
            clearFormError={clearFormError}
            errors={errors}
            setErrors={setErrors}
          />

          <AdjustmentVariantsStep
            variantQuery={variantQuery}
            onVariantQueryChange={setVariantQuery}
            pickerOpen={pickerOpen}
            onPickerOpenChange={setPickerOpen}
            effectiveCreateLocationId={effectiveCreateLocationId}
            hasBlockingAction={hasBlockingAction}
            loadingVariants={loadingVariants}
            variantResults={variantResults}
            highlightedIndex={highlightedIndex}
            onHighlightChange={setHighlightedIndex}
            filteredGroupedStyles={filteredGroupedStyles}
            selectedStyle={selectedStyle}
            onSelectStyle={setSelectedStyle}
            draftLines={draftLines}
            addDraftLine={addDraftLine}
            removeDraftLine={removeDraftLine}
            updateCountedQty={updateCountedQty}
            errors={errors}
            clearFormError={clearFormError}
            setVariantResults={setVariantResults}
            selectedStyleAvailableCount={selectedStyleAvailableCount}
          />

          <AdjustmentDraftStep
            draftLines={draftLines}
            draftTotals={draftTotals}
            updateCountedQty={updateCountedQty}
            removeDraftLine={removeDraftLine}
          />
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