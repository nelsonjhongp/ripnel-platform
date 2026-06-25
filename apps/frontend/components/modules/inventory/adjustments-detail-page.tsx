"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  LoaderCircle,
  Package,
  RotateCcw,
  SquareCheckBig,
  X,
} from "lucide-react";
import {
  ErrorPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsMetricRow } from "@/components/ui/ops-metric-row";
import { OpsPanelSection } from "@/components/ui/ops-panel-section";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsPageShell, OpsTableWrap } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { apiFetchData } from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";
import { useApiGet } from "@/hooks/use-api-get";
import { appRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  INFO_BOX_XL,
} from "./adjustments-constants";
import { ADJ } from "./adjustments-messages";
import {
  type AdjustmentDetail,
  type AdjustmentDetailData,
  formatAdjustmentDateTime,
  formatAdjustmentIntent,
  formatAdjustmentStatus,
  getAdjustmentDifferenceClasses,
  resolveAdjustmentIntent,
} from "./inventory-adjustments-shared";

export function InventoryAdjustmentsDetailPage() {
  const routeParams = useParams<{ adjustmentId: string }>();
  const adjustmentId = String(routeParams?.adjustmentId || "");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const {
    data: detailData,
    loading,
    error,
    refetch,
  } = useApiGet(
    () =>
      apiFetchData<AdjustmentDetailData>(
        `/api/inventory/adjustments/${adjustmentId}`,
        { cache: "no-store", suppressAuthEvent: true }
      ),
    [adjustmentId]
  );

  const detail: AdjustmentDetail | null = detailData?.adjustment ?? null;
  const isDraft = detail?.status === "draft";

  const totalSystem = useMemo(
    () => (detail?.lines ?? []).reduce((acc, l) => acc + l.system_qty, 0),
    [detail]
  );

  const totalCounted = useMemo(
    () => (detail?.lines ?? []).reduce((acc, l) => acc + l.counted_qty, 0),
    [detail]
  );

  const totalDiff = totalCounted - totalSystem;

  // ── Confirm ──
  async function handleConfirm() {
    if (!detail) return;

    setConfirming(true);
    try {
      await apiFetchData<AdjustmentDetailData>(
        `/api/inventory/adjustments/${detail.adjustment_id}/confirm`,
        { method: "POST", body: JSON.stringify({}), cache: "no-store" }
      );
      setConfirmOpen(false);
      showSuccess(ADJ.toast.confirmed);
      void refetch();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : ADJ.dialog.confirmError
      );
    } finally {
      setConfirming(false);
    }
  }

  // ── Cancel ──
  async function handleCancel() {
    if (!detail) return;

    setCancelling(true);
    try {
      await apiFetchData<AdjustmentDetailData>(
        `/api/inventory/adjustments/${detail.adjustment_id}/cancel`,
        { method: "POST", body: JSON.stringify({}), cache: "no-store" }
      );
      setCancelOpen(false);
      showSuccess(ADJ.toast.cancelled);
      void refetch();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : ADJ.dialog.cancelError
      );
    } finally {
      setCancelling(false);
    }
  }

  // ── Loading / Error / Not Found ──
  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title={ADJ.detail.loading}
        description=""
      />
    );
  }

  if (error) {
    return (
      <ErrorPage
        variant="ops"
        title={ADJ.detail.loadError}
        description={error}
        onReset={() => void refetch()}
      />
    );
  }

  if (!detail) {
    return <NotFoundPage variant="ops" />;
  }

  const intent = resolveAdjustmentIntent(detail);

  return (
    <OpsPageShell width="wide" className="space-y-5">
      {/* ── Header ── */}
      <PosHeader
        eyebrow={ADJ.header.eyebrow}
        title={detail.adjustment_number}
        meta={
          <OpsStatusBadge
            tone={
              detail.status === "confirmed"
                ? "success"
                : detail.status === "cancelled"
                  ? "danger"
                  : "warning"
            }
            size="sm"
          >
            {formatAdjustmentStatus(detail.status)}
          </OpsStatusBadge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={appRoutes.inventoryAdjustments}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {ADJ.detail.back}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => void refetch()}
              aria-label="Actualizar"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {/* ── Header panel ── */}
      <div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left */}
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-[var(--ops-text-muted)]">
              {formatAdjustmentIntent(intent)} · {detail.location_name} · {detail.location_code}
            </p>

            <div>
              <p className="text-sm text-[var(--ops-text)]">
                {detail.reason || ADJ.list.emptyReason}
              </p>
              {detail.notes ? (
                <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">
                  {detail.notes}
                </p>
              ) : null}
            </div>

            <p className="text-xs text-[var(--ops-text-muted)]">
              {ADJ.detail.created}: {detail.created_by_name || ADJ.list.systemUser} ·{" "}
              {formatAdjustmentDateTime(detail.created_at)}
              {detail.confirmed_at
                ? ` · ${ADJ.detail.confirmed}: ${detail.confirmed_by_name || ADJ.list.systemUser} · ${formatAdjustmentDateTime(detail.confirmed_at)}`
                : ""}
            </p>
          </div>

          {/* Right — totals highlight */}
          <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-52`}>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}
            >
              {ADJ.metrics.difference}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
              {totalDiff > 0 ? "+" : ""}
              {totalDiff}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
              <span>{ADJ.metrics.systemTotal} {totalSystem}</span>
              <span>{ADJ.metrics.countedTotal} {totalCounted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid: main + sidebar ── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
        {/* ── Main column ── */}
        <OpsPanelSection
          title={ADJ.detail.products}
          icon={<Package className="h-4 w-4 text-[var(--ripnel-accent)]" />}
        >
          {detail.lines.length > 0 ? (
            <div className="-mx-[var(--ops-panel-padding)] -mb-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl">
              <OpsTableWrap minWidth="580px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">{ADJ.detail.variants}</th>
                      <th className="px-4 py-3 text-right">{ADJ.detail.system}</th>
                      <th className="px-4 py-3 text-right">{ADJ.detail.counted}</th>
                      <th className="px-4 py-3 text-right">{ADJ.detail.difference}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {detail.lines.map((line) => (
                      <tr
                        key={line.adjustment_line_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                            {line.style_name}
                          </p>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                            {line.sku}
                          </p>
                          <p className="truncate text-xs text-[var(--ops-text-muted)]">
                            {line.style_code} · {line.size_code} / {line.color_name}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                          {line.system_qty}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold text-[var(--ops-text)]">
                          {line.counted_qty}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                            getAdjustmentDifferenceClasses(line.difference_qty)
                          )}
                        >
                          {line.difference_qty > 0 ? "+" : ""}
                          {line.difference_qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OpsTableWrap>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--ops-text-muted)]">
              {ADJ.create.emptyDraft}
            </p>
          )}
        </OpsPanelSection>

        {/* ── Sidebar ── */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {/* ── Actions (only for draft) ── */}
          {isDraft ? (
            <OpsPanelSection title={ADJ.detail.actions}>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  className="w-full rounded-lg"
                  onClick={() => setConfirmOpen(true)}
                  disabled={confirming || cancelling}
                >
                  <SquareCheckBig className="h-4 w-4" />
                  {ADJ.dialog.confirmButton}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full rounded-lg"
                  onClick={() => setCancelOpen(true)}
                  disabled={confirming || cancelling}
                >
                  <X className="h-4 w-4" />
                  {ADJ.dialog.cancelButton}
                </Button>
              </div>
            </OpsPanelSection>
          ) : null}

          {/* ── Totals ── */}
          <OpsPanelSection
            title={ADJ.detail.totals}
            icon={<Calculator className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <div className="space-y-2">
              <OpsMetricRow
                label={ADJ.metrics.systemTotal}
                value={String(totalSystem)}
              />
              <OpsMetricRow
                label={ADJ.metrics.countedTotal}
                value={String(totalCounted)}
              />
              <OpsMetricRow
                label={ADJ.metrics.difference}
                value={`${totalDiff > 0 ? "+" : ""}${totalDiff}`}
                tone={totalDiff !== 0 ? "warning" : "default"}
              />
              <div className="border-t border-[var(--ops-border-soft)] pt-2">
                <OpsMetricRow
                  label={ADJ.metrics.lines}
                  value={String(detail.lines.length)}
                />
              </div>
            </div>
          </OpsPanelSection>

          {/* ── Link to kardex (only for confirmed) ── */}
          {detail.status === "confirmed" ? (
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
            >
              <Link
                href={`${appRoutes.inventoryMovements}?query=${encodeURIComponent(detail.adjustment_id)}`}
              >
                <Package className="h-4 w-4" />
                {ADJ.dialog.viewMovements}
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>

      {/* ── Confirm dialog ── */}
      <OpsDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={ADJ.dialog.confirmTitle}
        description={ADJ.dialog.confirmDesc(
          detail.adjustment_number,
          detail.location_name
        )}
        size="sm"
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
        <div className="space-y-3 text-sm text-[var(--ops-text-muted)]">
          <div className="space-y-2">
            <OpsMetricRow
              label={ADJ.metrics.lines}
              value={String(detail.lines.length)}
            />
            <OpsMetricRow
              label={ADJ.metrics.difference}
              value={`${totalDiff > 0 ? "+" : ""}${totalDiff}`}
              tone={totalDiff !== 0 ? "warning" : "default"}
            />
          </div>
          <p className="text-xs">{ADJ.detail.confirmNote}</p>
        </div>
      </OpsDialog>

      {/* ── Cancel dialog ── */}
      <OpsDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={ADJ.dialog.cancelTitle}
        description={ADJ.dialog.cancelDesc(detail.adjustment_number)}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              {ADJ.dialog.close}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-lg px-4"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADJ.dialog.cancelling}
                </>
              ) : (
                ADJ.dialog.cancelButton
              )}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--ops-text-muted)]">
          {ADJ.dialog.cancelDesc(detail.adjustment_number)}
        </p>
      </OpsDialog>
    </OpsPageShell>
  );
}
