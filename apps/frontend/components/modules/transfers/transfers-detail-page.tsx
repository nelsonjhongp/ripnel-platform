"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCw,
  SendHorizonal,
  ShieldCheck,
  Truck,
  X,
  XCircle,
  type LucideIcon,
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError, apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { appRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatTransferNextStep,
  formatTransferPrimaryAction,
  formatTransferStatus,
  getTransferStatusClasses,
  type TransferAvailableActions,
  type TransferDetail,
  type TransferLineDetail,
} from "./transfers-shared";

type TransferStatus = TransferDetail["status"];
type TransferActionKey = keyof TransferAvailableActions;
type TimelineState = "complete" | "current" | "pending" | "cancelled";

const TRANSFER_STAGE_ORDER: TransferStatus[] = [
  "requested",
  "approved",
  "shipped",
  "received",
  "cancelled",
];

const ACTION_CONFIG: Record<
  TransferActionKey,
  {
    label: string;
    confirmLabel: string;
    path: (transferId: string) => string;
    successMessage: string;
    icon: ReactNode;
    tone: "accent" | "danger";
    description: (transfer: TransferDetail) => ReactNode;
  }
> = {
  approve: {
    label: "Aprobar",
    confirmLabel: "Aprobar solicitud",
    path: (transferId) => `/api/transfers/${transferId}/approve`,
    successMessage: "Solicitud aprobada para despacho.",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin número"}</strong> quedará
        lista para despacho desde <strong>{transfer.from_location_name}</strong>.
      </>
    ),
  },
  ship: {
    label: "Despachar",
    confirmLabel: "Despachar transferencia",
    path: (transferId) => `/api/transfers/${transferId}/ship`,
    successMessage: "Transferencia despachada.",
    icon: <SendHorizonal className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin número"}</strong> descontará
        stock del origen y quedará lista para recepción en{" "}
        <strong>{transfer.to_location_name}</strong>.
      </>
    ),
  },
  receive: {
    label: "Recepcionar",
    confirmLabel: "Confirmar recepción",
    path: (transferId) => `/api/transfers/${transferId}/receive`,
    successMessage: "Transferencia recepcionada.",
    icon: <CheckCheck className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin número"}</strong> ingresará
        stock en <strong>{transfer.to_location_name}</strong>.
      </>
    ),
  },
  cancel: {
    label: "Cancelar",
    confirmLabel: "Cancelar transferencia",
    path: (transferId) => `/api/transfers/${transferId}/cancel`,
    successMessage: "Transferencia cancelada.",
    icon: <X className="h-3.5 w-3.5" />,
    tone: "danger",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin número"}</strong> quedará
        anulada y no continuará el flujo entre sedes.
      </>
    ),
  },
};

function getTransferBannerCopy(transfer: TransferDetail) {
  if (transfer.status === "requested") {
    return {
      title: "Solicitud pendiente de aprobación",
      description: transfer.active_message,
      tone:
        "border-[color:color-mix(in_srgb,var(--ripnel-accent)_20%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_80%,var(--ops-surface))] text-[var(--ops-text)]",
      iconClass: "text-[var(--ripnel-accent-hover)]",
      Icon: CircleAlert,
    };
  }

  if (transfer.status === "approved") {
    return {
      title: "Transferencia aprobada",
      description: transfer.active_message,
      tone:
        "border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_76%,var(--ops-surface))] text-[var(--ops-text)]",
      iconClass: "text-[var(--ripnel-accent-hover)]",
      Icon: ClipboardList,
    };
  }

  if (transfer.status === "shipped") {
    return {
      title: "Transferencia despachada",
      description: transfer.active_message,
      tone:
        "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[var(--ops-text)]",
      iconClass: "text-[color:color-mix(in_srgb,#b45309_82%,var(--ops-text))]",
      Icon: Truck,
    };
  }

  if (transfer.status === "received") {
    return {
      title: "Transferencia recibida",
      description: transfer.active_message,
      tone:
        "border-[color:color-mix(in_srgb,#10b981_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_10%,var(--ops-surface))] text-[var(--ops-text)]",
      iconClass: "text-[color:color-mix(in_srgb,#059669_84%,var(--ops-text))]",
      Icon: CheckCircle2,
    };
  }

  return {
    title: "Transferencia cancelada",
    description: transfer.active_message,
    tone:
      "border-[color:color-mix(in_srgb,#e11d48_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] text-[var(--ops-text)]",
    iconClass: "text-[color:color-mix(in_srgb,#be123c_84%,var(--ops-text))]",
    Icon: XCircle,
  };
}

function getTransferImpactCopy(status: TransferStatus) {
  if (status === "requested" || status === "approved") {
    return "Sin impacto en stock";
  }

  if (status === "shipped") {
    return "Stock descontado en origen";
  }

  if (status === "received") {
    return "Stock descontado en origen e ingresado en destino";
  }

  return "Sin impacto final / transferencia anulada";
}

function getPendingMetricLabel(status: TransferStatus) {
  if (status === "requested" || status === "approved") {
    return "Pendiente despacho";
  }

  if (status === "shipped") {
    return "Pendiente recepción";
  }

  return "Pendiente";
}

function getPendingMetricTone(status: TransferStatus) {
  if (status === "received") {
    return "success" as const;
  }

  if (status === "shipped" || status === "requested" || status === "approved") {
    return "warning" as const;
  }

  return "default" as const;
}

function getLinePendingValue(status: TransferStatus, line: TransferLineDetail) {
  if (status === "requested" || status === "approved") {
    return Math.max(0, Number(line.qty_requested || 0) - Number(line.qty_shipped || 0));
  }

  if (status === "shipped") {
    return Math.max(0, Number(line.qty_shipped || 0) - Number(line.qty_received || 0));
  }

  if (status === "received") {
    return 0;
  }

  return null;
}

function formatTraceStatus(name: string | null, date: string | null) {
  if (!date) {
    return "Pendiente";
  }

  return `${name || "Sin usuario"} · ${formatDateTime(date)}`;
}

function getTimelineState(
  transfer: TransferDetail,
  step: Exclude<TransferStatus, "cancelled">
): TimelineState {
  if (transfer.status === "cancelled") {
    if (step === "requested") {
      return "complete";
    }

    if (step === "approved" && transfer.approved_at) {
      return "complete";
    }

    return "pending";
  }

  const currentIndex = TRANSFER_STAGE_ORDER.indexOf(transfer.status);
  const stepIndex = TRANSFER_STAGE_ORDER.indexOf(step);

  if (stepIndex < currentIndex) {
    return "complete";
  }

  if (stepIndex === currentIndex) {
    return "current";
  }

  return "pending";
}

function getTimelineStateClasses(state: TimelineState) {
  if (state === "complete") {
    return {
      card: "border-[color:color-mix(in_srgb,#10b981_30%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_9%,var(--ops-surface))]",
      icon: "border-[color:color-mix(in_srgb,#10b981_36%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_16%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]",
      label: "text-[color:color-mix(in_srgb,#047857_88%,var(--ops-text))]",
    };
  }

  if (state === "current") {
    return {
      card: "border-[color:color-mix(in_srgb,var(--ripnel-accent)_30%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_84%,var(--ops-surface))]",
      icon: "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_90%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]",
      label: "text-[var(--ripnel-accent-hover)]",
    };
  }

  if (state === "cancelled") {
    return {
      card: "border-[color:color-mix(in_srgb,#e11d48_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))]",
      icon: "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_84%,var(--ops-text))]",
      label: "text-[color:color-mix(in_srgb,#be123c_84%,var(--ops-text))]",
    };
  }

  return {
    card: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
    icon: "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]",
    label: "text-[var(--ops-text-muted)]",
  };
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))]"
        : tone === "success"
          ? "border-[color:color-mix(in_srgb,#10b981_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_10%,var(--ops-surface))]"
          : "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]";

  return (
    <div className={cn("rounded-xl border px-4 py-3.5", toneClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-[var(--ops-text)]">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--ops-text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--ops-text)]">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 border-b border-[var(--ops-border-soft)] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="text-sm text-[var(--ops-text)]">{value}</p>
    </div>
  );
}

export function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<Error | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [pendingAction, setPendingAction] = useState<TransferActionKey | null>(null);
  const [busyAction, setBusyAction] = useState<TransferActionKey | null>(null);

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

  useEffect(() => {
    let active = true;

    params.then(({ transferId: resolvedTransferId }) => {
      if (active) {
        setTransferId(resolvedTransferId);
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!transferId) {
      return;
    }

    let active = true;

    async function loadTransfer() {
      setLoading(true);
      setPageError(null);
      setActionError(null);

      try {
        const payload = await apiFetch<ApiEnvelope<TransferDetail> | TransferDetail>(
          `/api/transfers/${transferId}`,
          { cache: "no-store" }
        );
        const data = unwrapApiData(payload);

        if (active) {
          setTransfer(data);
        }
      } catch (loadError) {
        if (active) {
          setTransfer(null);
          setPageError(
            loadError instanceof Error ? loadError : new Error("No se pudo cargar la transferencia.")
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTransfer();

    return () => {
      active = false;
    };
  }, [reloadNonce, transferId]);

  async function handleTransferAction(action: TransferActionKey) {
    if (!transferId) {
      return;
    }

    setBusyAction(action);
    setActionError(null);
    setNotice(null);

    try {
      await apiFetch(ACTION_CONFIG[action].path(transferId), {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(ACTION_CONFIG[action].successMessage);
      setReloadNonce((current) => current + 1);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : `No se pudo ejecutar ${ACTION_CONFIG[action].label.toLowerCase()}.`
      );
    } finally {
      setBusyAction(null);
    }
  }

  const totals = useMemo(() => {
    if (!transfer) {
      return null;
    }

    const baseTotals = transfer.lines.reduce(
      (accumulator, line) => {
        accumulator.lines += 1;
        accumulator.requested += Number(line.qty_requested || 0);
        accumulator.shipped += Number(line.qty_shipped || 0);
        accumulator.received += Number(line.qty_received || 0);
        return accumulator;
      },
      { lines: 0, requested: 0, shipped: 0, received: 0 }
    );

    const pendingToShip = Math.max(0, baseTotals.requested - baseTotals.shipped);
    const pendingToReceive = Math.max(0, baseTotals.shipped - baseTotals.received);

    return {
      ...baseTotals,
      pendingToShip,
      pendingToReceive,
      pendingDisplay:
        transfer.status === "requested" || transfer.status === "approved"
          ? pendingToShip
          : transfer.status === "shipped"
            ? pendingToReceive
            : transfer.status === "received"
              ? 0
              : "—",
    };
  }, [transfer]);

  const hasLineNotes = useMemo(
    () => Boolean(transfer?.lines.some((line) => Boolean(line.notes?.trim()))),
    [transfer]
  );

  const banner = transfer ? getTransferBannerCopy(transfer) : null;
  const movementsHref = transfer
    ? `${appRoutes.inventoryMovements}?query=${encodeURIComponent(transfer.transfer_id)}`
    : appRoutes.inventoryMovements;
  const movementsPending = transfer?.status === "requested" || transfer?.status === "approved";
  const visibleActions = transfer
    ? (Object.keys(transfer.available_actions) as TransferActionKey[]).filter(
        (action) => transfer.available_actions[action]
      )
    : [];

  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title="Cargando detalle de transferencia"
        description="Estamos recuperando la cabecera operativa y sus líneas asociadas."
      />
    );
  }

  if (pageError instanceof ApiError && pageError.status === 404) {
    return <NotFoundPage variant="ops" />;
  }

  if (pageError instanceof ApiError && pageError.status === 403) {
    return <ForbiddenPage variant="ops" />;
  }

  if (pageError || !transfer || !totals || !banner) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir el detalle de transferencia"
        description={
          pageError?.message || "La transferencia solicitada no está disponible para esta sede."
        }
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
    <OpsPageShell width="wide">
      <div className="space-y-3">
        <PosHeader
          eyebrow="Transferencias"
          title={transfer.transfer_number || "Transferencia"}
          description={`${transfer.from_location_name} ${String.fromCharCode(8594)} ${transfer.to_location_name}`}
          meta={
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                getTransferStatusClasses(transfer.status)
              )}
            >
              {formatTransferStatus(transfer.status)}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                <Link href={appRoutes.transfers}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver a transferencias
                </Link>
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      onClick={() => setReloadNonce((current) => current + 1)}
                      aria-label="Actualizar detalle"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Actualizar detalle</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {visibleActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={action === "cancel" ? "destructive" : "accent"}
                  size="sm"
                  className="rounded-lg px-3"
                  disabled={busyAction === action}
                  onClick={() => setPendingAction(action)}
                >
                  {busyAction === action ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    ACTION_CONFIG[action].icon
                  )}
                  {formatTransferPrimaryAction(action)}
                </Button>
              ))}

              {movementsPending ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                          <Link href={movementsHref}>
                            <Package className="h-3.5 w-3.5" />
                            Ver movimientos de stock
                          </Link>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Sin movimientos generados todavía.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={movementsHref}>
                    <Package className="h-3.5 w-3.5" />
                    Ver movimientos de stock
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        <p className="text-sm text-[var(--ops-text-muted)]">
          Creada por {transfer.created_by_name || "Sin usuario"} &middot;{" "}
          {formatDateTime(transfer.created_at)}
        </p>
      </div>

      {notice ? <AdminInlineMessage tone="success">{notice}</AdminInlineMessage> : null}
      {actionError ? <AdminInlineMessage tone="danger">{actionError}</AdminInlineMessage> : null}

      <section className={cn("rounded-xl border px-4 py-4 md:px-5", banner.tone)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/12 bg-white/60",
              banner.iconClass
            )}
          >
            <banner.Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">{banner.title}</h2>
            <p className="text-sm leading-5 text-[var(--ops-text-muted)]">{banner.description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
        <section className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">Siguiente etapa</h2>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Paso
              </p>
              <p className="text-sm font-semibold text-[var(--ops-text)]">
                {formatTransferNextStep(transfer.next_step)}
              </p>
            </div>
            <div className="hidden justify-center md:flex">
              <ArrowRight className="h-4 w-4 text-[var(--ops-text-muted)]" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Responsable
              </p>
              <p className="text-sm font-semibold text-[var(--ops-text)]">
                {transfer.next_owner?.location_name || "Sin siguiente responsable"}
              </p>
              {transfer.next_owner?.location_code ? (
                <p className="text-[12px] text-[var(--ops-text-muted)]">
                  {transfer.next_owner.location_code}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Líneas" value={totals.lines} />
          <MetricCard label="Total solicitado" value={totals.requested} tone="accent" />
          <MetricCard label="Total despachado" value={totals.shipped} tone="warning" />
          <MetricCard label="Total recibido" value={totals.received} tone="success" />
          <MetricCard
            label={getPendingMetricLabel(transfer.status)}
            value={totals.pendingDisplay}
            tone={getPendingMetricTone(transfer.status)}
          />
        </div>
      </div>

      <OpsSectionDivider className="space-y-5">
        <OpsTableBlock>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">Timeline operativo</h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
            {timelineItems.map((item) => {
              const styles = getTimelineStateClasses(item.state);

              return (
                <article key={item.key} className={cn("rounded-xl border px-4 py-4", styles.card)}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                        styles.icon
                      )}
                    >
                      <item.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className={cn("text-sm font-semibold", styles.label)}>{item.label}</p>
                      {item.date ? (
                        <>
                          <p className="text-sm text-[var(--ops-text)]">{item.user || "Sin usuario"}</p>
                          <p className="text-[12px] text-[var(--ops-text-muted)]">
                            {formatDateTime(item.date)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--ops-text-muted)]">Pendiente</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </OpsTableBlock>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr_0.9fr]">
          <InfoCard title="Ruta de transferencia" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Origen
                </p>
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {transfer.from_location_name}
                </p>
                <p className="text-[12px] text-[var(--ops-text-muted)]">
                  {transfer.from_location_code}
                </p>
              </div>

              <div className="hidden items-center justify-center sm:flex">
                <ArrowRight className="h-4 w-4 text-[var(--ops-text-muted)]" />
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Destino
                </p>
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {transfer.to_location_name}
                </p>
                <p className="text-[12px] text-[var(--ops-text-muted)]">
                  {transfer.to_location_code}
                </p>
              </div>
            </div>

            <SummaryItem label="Impacto en stock" value={getTransferImpactCopy(transfer.status)} />
          </InfoCard>

          <InfoCard title="Trazabilidad" icon={ClipboardList}>
            <div className="space-y-3">
              <div className="grid gap-1.5 border-b border-[var(--ops-border-soft)] pb-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Creada
                </p>
                <p className="text-sm text-[var(--ops-text)]">
                  {formatTraceStatus(transfer.created_by_name, transfer.created_at)}
                </p>
              </div>

              <div className="grid gap-1.5 border-b border-[var(--ops-border-soft)] pb-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Aprobada
                </p>
                <p className="text-sm text-[var(--ops-text)]">
                  {formatTraceStatus(transfer.approved_by_name, transfer.approved_at)}
                </p>
              </div>

              <div className="grid gap-1.5 border-b border-[var(--ops-border-soft)] pb-3 md:grid-cols-[160px_minmax(0,1fr)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Despachada
                </p>
                <p className="text-sm text-[var(--ops-text)]">
                  {formatTraceStatus(transfer.shipped_by_name, transfer.shipped_at)}
                </p>
              </div>

              <div
                className={cn(
                  "grid gap-1.5 md:grid-cols-[160px_minmax(0,1fr)]",
                  transfer.cancelled_at ? "border-b border-[var(--ops-border-soft)] pb-3" : ""
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Recibida
                </p>
                <p className="text-sm text-[var(--ops-text)]">
                  {formatTraceStatus(transfer.received_by_name, transfer.received_at)}
                </p>
              </div>

              {transfer.cancelled_at ? (
                <div className="grid gap-1.5 md:grid-cols-[160px_minmax(0,1fr)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Cancelada
                  </p>
                  <p className="text-sm text-[var(--ops-text)]">
                    {formatTraceStatus(transfer.cancelled_by_name, transfer.cancelled_at)}
                  </p>
                </div>
              ) : null}
            </div>
          </InfoCard>

          <InfoCard title="Notas" icon={FileText}>
            <p className="text-sm leading-6 text-[var(--ops-text)]">
              {transfer.notes?.trim() || "Sin notas registradas."}
            </p>
          </InfoCard>
        </div>

        <OpsTableBlock>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">
              Líneas de transferencia
            </h2>
          </div>

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
                {transfer.lines.map((line) => {
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
                })}
              </tbody>
              <tfoot className="bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))]">
                <tr className="border-t border-[var(--ops-border-strong)] text-sm font-semibold text-[var(--ops-text)]">
                  <td className="px-4 py-3 text-right" colSpan={2}>
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.requested}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.shipped}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.received}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.pendingDisplay}</td>
                  {hasLineNotes ? <td className="px-4 py-3" /> : null}
                </tr>
              </tfoot>
            </table>
          </OpsTableWrap>
        </OpsTableBlock>
      </OpsSectionDivider>

      <AdminConfirmModal
        open={Boolean(pendingAction)}
        title={
          pendingAction ? ACTION_CONFIG[pendingAction].confirmLabel : "Confirmar acción"
        }
        description={pendingAction ? ACTION_CONFIG[pendingAction].description(transfer) : ""}
        confirmLabel={
          pendingAction ? ACTION_CONFIG[pendingAction].confirmLabel : "Confirmar"
        }
        confirmTone={pendingAction ? ACTION_CONFIG[pendingAction].tone : "accent"}
        busy={Boolean(pendingAction && busyAction === pendingAction)}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) {
            return;
          }

          void handleTransferAction(pendingAction);
          setPendingAction(null);
        }}
      />
    </OpsPageShell>
  );
}
