"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Info,
  LoaderCircle,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";

import { useSidebarTopbarBreadcrumbs } from "@/components/sidebar/SidebarShell";
import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { appRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  formatTransferNextStep,
  formatTransferPrimaryAction,
  formatTransferStatus,
  getTransferStatusClasses,
  TRANSFER_ACTION_CONFIG,
  type TransferActionKey,
  type TransferDetail,
  type TransferLineDetail,
  type TransferSummary,
} from "./transfers-shared";
import { formatDateTime } from "@/lib/date-utils";
import { TRANS } from "./transfers-messages";
import { OpsDialog } from "@/components/ui/ops-dialog";

type TransferStatus = TransferDetail["status"];
type TimelineState = "complete" | "current" | "pending" | "cancelled";

const TRANSFER_STAGE_ORDER: TransferStatus[] = [
  "requested",
  "approved",
  "shipped",
  "received",
  "cancelled",
];

const DETAIL_PAGE_SIZE = 4;

function getTimelineState(
  transfer: TransferDetail,
  step: Exclude<TransferStatus, "cancelled">
): TimelineState {
  if (transfer.status === "cancelled") {
    if (step === "requested") return "complete";
    if (step === "approved" && transfer.approved_at) return "complete";
    return "pending";
  }

  const currentIndex = TRANSFER_STAGE_ORDER.indexOf(transfer.status);
  const stepIndex = TRANSFER_STAGE_ORDER.indexOf(step);

  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

function getTimelineIconClasses(state: TimelineState) {
  if (state === "complete")
    return "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]";
  if (state === "current")
    return "border-[var(--ops-tone-accent-border)] bg-[var(--ops-tone-accent-bg)] text-[var(--ripnel-accent-hover)]";
  if (state === "cancelled")
    return "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]";
  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
}

function toneToButtonVariant(tone: "danger" | "accent" | "neutral"): "accent" | "destructive" | "outline" {
  if (tone === "danger") return "destructive";
  if (tone === "neutral") return "outline";
  return "accent";
}

function getLinePendingValue(status: TransferStatus, line: TransferLineDetail) {
  if (status === "requested" || status === "approved")
    return Math.max(0, Number(line.qty_requested || 0) - Number(line.qty_shipped || 0));
  if (status === "shipped")
    return Math.max(0, Number(line.qty_shipped || 0) - Number(line.qty_received || 0));
  if (status === "received") return 0;
  return null;
}

export function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const [transferId, setTransferId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<TransferActionKey | null>(null);
  const [busyAction, setBusyAction] = useState<TransferActionKey | null>(null);
  const [linesPage, setLinesPage] = useState(1);

  useEffect(() => {
    let active = true;
    params.then(({ transferId: resolvedTransferId }) => {
      if (active) setTransferId(resolvedTransferId);
    });
    return () => { active = false; };
  }, [params]);

  const {
    data: transfer,
    loading,
    refetch,
  } = useApiGet<TransferDetail>(
    transferId
      ? () => {
          setPageError(null);
          return apiFetch<ApiEnvelope<TransferDetail> | TransferDetail>(
            `/api/transfers/${transferId}`,
            { cache: "no-store" }
          )
            .then(unwrapApiData)
            .catch((err) => {
              setPageError(err instanceof Error ? err : new Error(TRANS.detail.loadError));
              throw err;
            });
        }
      : null,
    [transferId]
  );

  useSidebarTopbarBreadcrumbs(
    transfer
      ? [
          { label: "Inicio", href: appRoutes.home },
          { label: TRANS.header.eyebrow, href: appRoutes.transfers },
          { label: transfer.transfer_number || TRANS.header.detailTitle },
        ]
      : [
          { label: "Inicio", href: appRoutes.home },
          { label: TRANS.header.eyebrow, href: appRoutes.transfers },
          { label: TRANS.header.detailTitle },
        ]
  );

  async function handleTransferAction(action: TransferActionKey) {
    if (!transferId) return;
    setBusyAction(action);
    setActionError(null);
    setNotice(null);

    try {
      await apiFetch(TRANSFER_ACTION_CONFIG[action].path(transferId), {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(TRANSFER_ACTION_CONFIG[action].successMessage);
      refetch();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : `No se pudo ejecutar ${TRANSFER_ACTION_CONFIG[action].label.toLowerCase()}.`
      );
    } finally {
      setBusyAction(null);
    }
  }

  const totals = useMemo(() => {
    if (!transfer) return null;
    const base = transfer.lines.reduce(
      (acc, line) => {
        acc.lines += 1;
        acc.requested += Number(line.qty_requested || 0);
        acc.shipped += Number(line.qty_shipped || 0);
        acc.received += Number(line.qty_received || 0);
        return acc;
      },
      { lines: 0, requested: 0, shipped: 0, received: 0 }
    );
    return {
      ...base,
      pendingToShip: Math.max(0, base.requested - base.shipped),
      pendingToReceive: Math.max(0, base.shipped - base.received),
    };
  }, [transfer]);

  const hasLineNotes = useMemo(
    () => Boolean(transfer?.lines.some((line) => Boolean(line.notes?.trim()))),
    [transfer]
  );

  const movementsHref = transfer
    ? `${appRoutes.inventoryMovements}?query=${encodeURIComponent(transfer.transfer_id)}`
    : appRoutes.inventoryMovements;
  const movementsPending = transfer?.status === "requested" || transfer?.status === "approved";

  const visibleActions = transfer
    ? (Object.keys(transfer.available_actions) as TransferActionKey[]).filter(
        (action) => transfer.available_actions[action]
      )
    : [];

  const primaryAction = visibleActions.find((a) => a !== "cancel") || null;
  const secondaryActions = visibleActions.filter((a) => a !== primaryAction);

  const totalLinesPages = Math.max(1, Math.ceil((transfer?.lines.length || 0) / DETAIL_PAGE_SIZE));
  const safeLinesPage = Math.min(Math.max(linesPage, 1), totalLinesPages);
  const paginatedLines = (transfer?.lines || []).slice(
    (safeLinesPage - 1) * DETAIL_PAGE_SIZE,
    safeLinesPage * DETAIL_PAGE_SIZE
  );

  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title={TRANS.detail.loading}
        description={TRANS.detail.recovering}
      />
    );
  }

  if (pageError instanceof ApiError && pageError.status === 404) {
    return <NotFoundPage variant="ops" />;
  }

  if (pageError instanceof ApiError && pageError.status === 403) {
    return <ForbiddenPage variant="ops" />;
  }

  if (pageError || !transfer || !totals) {
    return (
      <ErrorPage
        variant="ops"
        title={TRANS.detail.noDataTitle}
        description={pageError?.message || TRANS.detail.noDataDesc}
      />
    );
  }

  const timelineItems = [
    {
      key: "requested" as const,
      label: TRANS.status.requested,
      user: transfer.created_by_name,
      date: transfer.created_at,
      Icon: ClipboardList,
      state: getTimelineState(transfer, "requested"),
    },
    {
      key: "approved" as const,
      label: TRANS.status.approved,
      user: transfer.approved_by_name,
      date: transfer.approved_at,
      Icon: CheckCircle2,
      state: getTimelineState(transfer, "approved"),
    },
    {
      key: "shipped" as const,
      label: TRANS.status.shipped,
      user: transfer.shipped_by_name,
      date: transfer.shipped_at,
      Icon: Truck,
      state: getTimelineState(transfer, "shipped"),
    },
    {
      key: "received" as const,
      label: TRANS.status.received,
      user: transfer.received_by_name,
      date: transfer.received_at,
      Icon: Package,
      state: getTimelineState(transfer, "received"),
    },
    ...(transfer.status === "cancelled"
      ? [
          {
            key: "cancelled" as const,
            label: TRANS.status.cancelled,
            user: transfer.cancelled_by_name,
            date: transfer.cancelled_at,
            Icon: XCircle,
            state: "cancelled" as const,
          },
        ]
      : []),
  ];

  return (
    <OpsPageShell width="wide" className="pb-28">
      <div className="space-y-1">
        <PosHeader
          eyebrow={TRANS.header.eyebrow}
          title={
            <span className="flex items-center gap-2.5">
              {transfer.transfer_number || TRANS.header.detailTitle}
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  getTransferStatusClasses(transfer.status)
                )}
              >
                {formatTransferStatus(transfer.status)}
              </span>
            </span>
          }
          description={
            <span className="text-sm">
              {transfer.from_location_name}
              <span className="mx-1.5 text-[var(--ops-text-muted)]">&rarr;</span>
              {transfer.to_location_name}
            </span>
          }
          meta={
            <span className="text-xs text-[var(--ops-text-muted)]">
              {TRANS.detail.createdBy} {transfer.created_by_name || "Sin usuario"} &middot;{" "}
              {formatDateTime(transfer.created_at)} &middot;{" "}
              {transfer.next_step
                ? `Siguiente: ${formatTransferNextStep(transfer.next_step)}`
                : TRANS.detail.completedFlow}
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                <Link href={appRoutes.transfers}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {TRANS.header.back}
                </Link>
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={() => refetch()}
                    aria-label={TRANS.header.refresh}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{TRANS.header.refresh}</TooltipContent>
              </Tooltip>

              {secondaryActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={action === "cancel" ? "destructive" : "outline"}
                  size="sm"
                  className="rounded-lg px-3"
                  disabled={busyAction === action}
                  onClick={() => setPendingAction(action)}
                >
                  {busyAction === action ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    TRANSFER_ACTION_CONFIG[action].icon
                  )}
                  {formatTransferPrimaryAction(action)}
                </Button>
              ))}

              {movementsPending ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                        <Link href={movementsHref}>
                          <Package className="h-3.5 w-3.5" />
                          {TRANS.detail.movements}
                        </Link>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{TRANS.detail.noMovements}</TooltipContent>
                </Tooltip>
              ) : (
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={movementsHref}>
                    <Package className="h-3.5 w-3.5" />
                    {TRANS.detail.movements}
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        {transfer.notes?.trim() ? (
          <p className="flex items-center gap-1.5 text-[13px] italic text-[var(--ops-text-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {transfer.notes.trim()}
          </p>
        ) : null}
      </div>

      {notice ? (
        <div className="rounded-lg border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-4 py-3 text-sm text-[var(--ops-tone-success-text)]">{notice}</div>
      ) : null}
      {actionError ? (
        <div className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm text-[var(--ops-tone-danger-text)]">{actionError}</div>
      ) : null}

      <OpsSectionDivider className="space-y-5">
        <div className="flex w-full items-center gap-0">
          {timelineItems.map((item, index) => {
            const iconStyles = getTimelineIconClasses(item.state);
            const isCancelled = item.state === "cancelled";

            return (
              <div key={item.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      iconStyles
                    )}
                  >
                    <item.Icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold whitespace-nowrap",
                      item.state === "current"
                        ? "text-[var(--ripnel-accent-hover)]"
                        : isCancelled
                          ? "text-[var(--ops-tone-danger-text)]"
                          : item.state === "complete"
                            ? "text-[var(--ops-tone-success-text)]"
                            : "text-[var(--ops-text-muted)]"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.date ? (
                    <span className="hidden text-[10px] text-[var(--ops-text-muted)] whitespace-nowrap text-center leading-tight sm:block">
                      {item.user ? `${item.user.split(" ")[0]}\n` : ""}
                      {formatDateTime(item.date)}
                    </span>
                  ) : (
                    <span className="hidden text-[10px] text-[var(--ops-text-muted)] sm:block">
                      {TRANS.detail.pending}
                    </span>
                  )}
                </div>
                {index < timelineItems.length - 1 ? (
                  <div className="mx-2 h-px flex-1 bg-[var(--ops-border-strong)] last:flex-none" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div>
          <p className="text-xs text-[var(--ops-text-muted)]">
            <span className="font-semibold text-[var(--ops-text)]">{totals.lines}</span>{" "}
            {totals.lines === 1 ? TRANS.metrics.lines.slice(0, -1) : TRANS.metrics.lines} solicitados &middot;{" "}
            <span className="font-semibold text-[var(--ops-text)]">{totals.requested}</span>{" "}
            {totals.requested === 1 ? TRANS.metrics.units.slice(0, -1) : TRANS.metrics.units} &middot;{" "}
            <span className="font-semibold text-[var(--ops-tone-success-text)]">
              {totals.received}
            </span>{" "}
            {TRANS.metrics.received} &middot;{" "}
            <span className="font-semibold text-[var(--ops-tone-warning-text)]">
              {totals.shipped}
            </span>{" "}
            {TRANS.metrics.shipped}
          </p>
        </div>

        <OpsTableBlock>
          <OpsTableWrap minWidth={hasLineNotes ? "1180px" : "1080px"}>
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">{TRANS.table.columns.products}</th>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3 text-right">{TRANS.table.columns.requested}</th>
                  <th className="px-4 py-3 text-right">{TRANS.table.columns.shipped}</th>
                  <th className="px-4 py-3 text-right">{TRANS.metrics.received}</th>
                  <th className="px-4 py-3 text-right">{TRANS.detail.pending}</th>
                  {hasLineNotes ? <th className="px-4 py-3">Notas</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {paginatedLines.length === 0 ? (
                  <tr>
                    <td colSpan={hasLineNotes ? 7 : 6} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      {TRANS.detail.noProducts}
                    </td>
                  </tr>
                ) : (
                  paginatedLines.map((line) => {
                    const pendingValue = getLinePendingValue(transfer.status, line);

                    return (
                      <tr
                        key={line.transfer_line_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="flex items-start gap-3">
                            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ripnel-accent-hover)]">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                {line.style_name}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                {line.style_code || line.sku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">
                            {line.color_name} / {line.size_code}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            {line.sku}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                          {line.qty_requested}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm tabular-nums text-[var(--ops-text)]">
                          {line.qty_shipped}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm tabular-nums text-[var(--ops-text)]">
                          {line.qty_received}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-medium tabular-nums text-[var(--ops-text)]">
                          {pendingValue === null ? "—" : pendingValue}
                        </td>
                        {hasLineNotes ? (
                          <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                            {line.notes?.trim() || "—"}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-[var(--ops-surface-muted)]">
                <tr className="border-t border-[var(--ops-border-strong)] text-sm font-semibold text-[var(--ops-text)]">
                  <td className="px-4 py-3 text-right" colSpan={2}>
                    {TRANS.detail.totals}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.requested}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.shipped}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.received}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {transfer.status === "requested" || transfer.status === "approved"
                      ? totals.pendingToShip
                      : transfer.status === "shipped"
                        ? totals.pendingToReceive
                        : transfer.status === "received"
                          ? 0
                          : "—"}
                  </td>
                  {hasLineNotes ? <td className="px-4 py-3" /> : null}
                </tr>
              </tfoot>
            </table>
          </OpsTableWrap>

          {transfer.lines.length > DETAIL_PAGE_SIZE ? (
            <Pagination
              page={safeLinesPage}
              totalPages={totalLinesPages}
              onPageChange={setLinesPage}
              className="border-t border-[var(--ops-border-strong)] px-4 py-2"
            />
          ) : null}
        </OpsTableBlock>
      </OpsSectionDivider>

      <OpsDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        title={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].confirmLabel : TRANS.detail.confirmAction}
        description={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].description(transfer as unknown as TransferSummary) : ""}
        size="sm"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setPendingAction(null)}>Cancelar</Button>
          <Button
            variant={pendingAction ? toneToButtonVariant(TRANSFER_ACTION_CONFIG[pendingAction].tone) : "accent"}
            disabled={Boolean(pendingAction && busyAction === pendingAction)}
            onClick={() => {
              if (!pendingAction) return;
              void handleTransferAction(pendingAction);
              setPendingAction(null);
            }}
          >
            {pendingAction && busyAction === pendingAction ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {TRANSFER_ACTION_CONFIG[pendingAction].confirmLabel}
              </span>
            ) : pendingAction ? (
              TRANSFER_ACTION_CONFIG[pendingAction].confirmLabel
            ) : TRANS.detail.confirmAction}
          </Button>
        </div>
      </OpsDialog>

      {primaryAction || visibleActions.includes("cancel") ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:left-[var(--sidebar-width)] md:pl-6 md:pr-8">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between">
            <p className="hidden text-sm text-[var(--ops-text-muted)] md:block">
              {transfer.transfer_number || TRANS.header.detailTitle} &middot;{" "}
              {transfer.from_location_name} &rarr; {transfer.to_location_name}
            </p>
            <div className="flex items-center gap-3">
              {primaryAction ? (
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="gap-2.5 rounded-xl px-6 text-base font-semibold shadow-sm"
                  disabled={busyAction === primaryAction}
                  onClick={() => setPendingAction(primaryAction)}
                >
                  {busyAction === primaryAction ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    TRANSFER_ACTION_CONFIG[primaryAction].icon
                  )}
                  {formatTransferPrimaryAction(primaryAction)}
                </Button>
              ) : null}
              {visibleActions.includes("cancel") ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  className="gap-2 rounded-xl px-5 text-sm font-semibold"
                  disabled={busyAction === "cancel"}
                  onClick={() => setPendingAction("cancel")}
                >
                  {busyAction === "cancel" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    TRANSFER_ACTION_CONFIG.cancel.icon
                  )}
                  {formatTransferPrimaryAction("cancel")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </OpsPageShell>
  );
}
