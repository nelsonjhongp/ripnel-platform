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
  AdminConfirmModal,
  AdminInlineMessage,
} from "@/components/admin/admin-ui";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    return "border-[color:color-mix(in_srgb,#10b981_36%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_16%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]";
  if (state === "current")
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_90%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]";
  if (state === "cancelled")
    return "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_84%,var(--ops-text))]";
  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
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
              setPageError(err instanceof Error ? err : new Error("No se pudo cargar la transferencia."));
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
          { label: "Transferencias", href: appRoutes.transfers },
          { label: transfer.transfer_number || "Transferencia" },
        ]
      : [
          { label: "Inicio", href: appRoutes.home },
          { label: "Transferencias", href: appRoutes.transfers },
          { label: "Transferencia" },
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
        title="Cargando detalle de transferencia"
        description="Recuperando datos operativos de la transferencia."
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
        title="No pudimos abrir el detalle de transferencia"
        description={pageError?.message || "La transferencia solicitada no está disponible para esta sede."}
      />
    );
  }

  const timelineItems = [
    {
      key: "requested" as const,
      label: "Solicitada",
      user: transfer.created_by_name,
      date: transfer.created_at,
      Icon: ClipboardList,
      state: getTimelineState(transfer, "requested"),
    },
    {
      key: "approved" as const,
      label: "Aprobada",
      user: transfer.approved_by_name,
      date: transfer.approved_at,
      Icon: CheckCircle2,
      state: getTimelineState(transfer, "approved"),
    },
    {
      key: "shipped" as const,
      label: "Despachada",
      user: transfer.shipped_by_name,
      date: transfer.shipped_at,
      Icon: Truck,
      state: getTimelineState(transfer, "shipped"),
    },
    {
      key: "received" as const,
      label: "Recibida",
      user: transfer.received_by_name,
      date: transfer.received_at,
      Icon: Package,
      state: getTimelineState(transfer, "received"),
    },
    ...(transfer.status === "cancelled"
      ? [
          {
            key: "cancelled" as const,
            label: "Cancelada",
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
          eyebrow="Transferencias"
          title={
            <span className="flex items-center gap-2.5">
              {transfer.transfer_number || "Transferencia"}
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
              Creada por {transfer.created_by_name || "Sin usuario"} &middot;{" "}
              {formatDateTime(transfer.created_at)} &middot;{" "}
              {transfer.next_step
                ? `Siguiente: ${formatTransferNextStep(transfer.next_step)}`
                : "Flujo completado"}
            </span>
          }
          actions={
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={appRoutes.transfers}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver
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
                      aria-label="Actualizar detalle"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Actualizar detalle</TooltipContent>
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
                            Movimientos
                          </Link>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Sin movimientos generados todavía.</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                    <Link href={movementsHref}>
                      <Package className="h-3.5 w-3.5" />
                      Movimientos
                    </Link>
                  </Button>
                )}
              </div>
            </TooltipProvider>
          }
        />

        {transfer.notes?.trim() ? (
          <p className="flex items-center gap-1.5 text-[13px] italic text-[var(--ops-text-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {transfer.notes.trim()}
          </p>
        ) : null}
      </div>

      {notice ? <AdminInlineMessage tone="success">{notice}</AdminInlineMessage> : null}
      {actionError ? <AdminInlineMessage tone="danger">{actionError}</AdminInlineMessage> : null}

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
                          ? "text-[color:color-mix(in_srgb,#be123c_84%,var(--ops-text))]"
                          : item.state === "complete"
                            ? "text-[color:color-mix(in_srgb,#047857_88%,var(--ops-text))]"
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
                      Pendiente
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
            {totals.lines === 1 ? "producto" : "productos"} solicitados &middot;{" "}
            <span className="font-semibold text-[var(--ops-text)]">{totals.requested}</span>{" "}
            {totals.requested === 1 ? "unidad" : "unidades"} &middot;{" "}
            <span className="font-semibold text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]">
              {totals.received}
            </span>{" "}
            recibidas &middot;{" "}
            <span className="font-semibold text-[color:color-mix(in_srgb,#d97706_82%,var(--ops-text))]">
              {totals.shipped}
            </span>{" "}
            despachadas
          </p>
        </div>

        <OpsTableBlock>
          <OpsTableWrap minWidth={hasLineNotes ? "1180px" : "1080px"}>
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3 text-right">Solicitado</th>
                  <th className="px-4 py-3 text-right">Despachado</th>
                  <th className="px-4 py-3 text-right">Recibido</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  {hasLineNotes ? <th className="px-4 py-3">Notas</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {paginatedLines.length === 0 ? (
                  <tr>
                    <td colSpan={hasLineNotes ? 7 : 6} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      No hay productos en esta transferencia.
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
              <tfoot className="bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))]">
                <tr className="border-t border-[var(--ops-border-strong)] text-sm font-semibold text-[var(--ops-text)]">
                  <td className="px-4 py-3 text-right" colSpan={2}>
                    Totales
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

      <AdminConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].confirmLabel : "Confirmar acción"}
        description={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].description(transfer as unknown as TransferSummary) : ""}
        confirmLabel={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].confirmLabel : "Confirmar"}
        confirmTone={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction].tone : "accent"}
        busy={Boolean(pendingAction && busyAction === pendingAction)}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          void handleTransferAction(pendingAction);
          setPendingAction(null);
        }}
      />

      {primaryAction || visibleActions.includes("cancel") ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:left-[var(--sidebar-width)] md:pl-6 md:pr-8">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between">
            <p className="hidden text-sm text-[var(--ops-text-muted)] md:block">
              {transfer.transfer_number || "Transferencia"} &middot;{" "}
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
