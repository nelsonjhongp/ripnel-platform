"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import {
  AdminConfirmModal,
  AdminInlineMessage,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForbiddenPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page";
import { apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { useTransferCapabilities } from "@/hooks/use-transfer-capabilities";
import { usePagination } from "@/hooks/use-pagination";
import { appRoutes } from "@/lib/routes";
import { formatDateTimeParts } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatTransferQueueLabel,
  TRANSFER_QUEUE_OPTIONS,
  TRANSFER_SCOPE_OPTIONS,
  TRANSFER_ACTION_CONFIG,
  type TransferActionConfig,
  type TransferActionKey,
  type TransferInboxItem,
  type TransferInboxResponse,
  type TransferPendingStage,
  type TransferScope,
} from "./transfers-shared";

type TransferRecord = TransferInboxItem;
type TransferRowAction = TransferActionKey | "detail";


function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesTransferQuery(transfer: TransferRecord, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return [
    transfer.transfer_number || "",
    transfer.from_location_name,
    transfer.from_location_code,
    transfer.to_location_name,
    transfer.to_location_code,
    transfer.active_message,
    transfer.next_owner?.location_name || "",
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function getVisibleStateCopy(transfer: TransferRecord) {
  if (transfer.status === "requested") {
    return {
      title: transfer.pending_stage === "pending_approval" ? "Por aprobar" : "Solicitada",
      subtitle: "Esperando aprobación",
    };
  }

  if (transfer.status === "approved") {
    return {
      title: "Por despachar",
      subtitle: "Aprobada",
    };
  }

  if (transfer.status === "shipped") {
    return {
      title: "Por recibir",
      subtitle: "Enviada",
    };
  }

  if (transfer.status === "received") {
    return {
      title: "Recibida",
      subtitle: "Completada",
    };
  }

  return {
    title: "Cancelada",
    subtitle: "Sin operación pendiente",
  };
}

function getTransferContextCopy(transfer: TransferRecord) {
  if (transfer.status === "requested") {
    return `Para ${transfer.to_location_name}`;
  }

  if (transfer.status === "approved") {
    return `Desde ${transfer.from_location_name}`;
  }

  if (transfer.status === "shipped") {
    return `Hacia ${transfer.to_location_name}`;
  }

  if (transfer.status === "received") {
    return `En ${transfer.to_location_name}`;
  }

  return "Documento cancelado";
}

function getTransferUnitsTotal(transfer: TransferRecord) {
  if (transfer.status === "shipped") {
    return transfer.qty_shipped_total;
  }

  if (transfer.status === "received") {
    return transfer.qty_received_total;
  }

  return transfer.qty_requested_total;
}

function getTransferPendingUnits(transfer: TransferRecord) {
  if (transfer.status === "requested") {
    return transfer.qty_requested_total;
  }

  if (transfer.status === "approved") {
    return Math.max(transfer.qty_requested_total - transfer.qty_shipped_total, 0);
  }

  if (transfer.status === "shipped") {
    return Math.max(transfer.qty_shipped_total - transfer.qty_received_total, 0);
  }

  if (transfer.status === "received") {
    return 0;
  }

  return null;
}

function formatProductsCount(value: number) {
  return `${value} ${value === 1 ? "producto" : "productos"}`;
}



function getPrimaryRowAction(queue: TransferPendingStage, transfer: TransferRecord): TransferRowAction {
  if (queue === "pending_approval" && transfer.available_actions.approve) {
    return "approve";
  }

  if (queue === "pending_dispatch" && transfer.available_actions.ship) {
    return "ship";
  }

  if (queue === "pending_receipts" && transfer.available_actions.receive) {
    return "receive";
  }

  if (queue === "open_for_store" && transfer.available_actions.cancel) {
    return "cancel";
  }

  return "detail";
}

function buildSecondaryMenuItems(
  transfer: TransferRecord,
  primaryAction: TransferRowAction,
  router: ReturnType<typeof useRouter>,
  busyAction: { transferId: string; action: TransferActionKey } | null,
  onConfirmAction: (action: TransferActionKey, transfer: TransferRecord) => void
) {
  const items: Array<{
    label: string;
    icon?: ReactNode;
    onSelect: () => void;
    tone?: "neutral" | "danger";
    disabled?: boolean;
  }> = [];

  if (primaryAction !== "detail") {
    items.push({
      label: "Ver detalle",
      icon: <Eye className="h-3.5 w-3.5" />,
      onSelect: () => router.push(`/transferencias/${transfer.transfer_id}`),
    });
  }

  const actionOrder: TransferActionKey[] = ["approve", "ship", "receive", "cancel"];

  for (const action of actionOrder) {
    if (!transfer.available_actions[action] || primaryAction === action) {
      continue;
    }

    items.push({
      label: TRANSFER_ACTION_CONFIG[action].label,
      icon:
        busyAction?.transferId === transfer.transfer_id && busyAction.action === action ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          TRANSFER_ACTION_CONFIG[action].icon
        ),
      tone: action === "cancel" ? "danger" : "neutral",
      disabled: busyAction?.transferId === transfer.transfer_id,
      onSelect: () => onConfirmAction(action, transfer),
    });
  }

  return items;
}

function buildQueueRows(
  inbox: TransferInboxResponse | null,
  queue: TransferPendingStage
) {
  if (!inbox) {
    return [];
  }

  return inbox.queues[queue];
}

function getQueueEmptyMessage(queue: TransferPendingStage) {
  if (queue === "open_for_store") {
    return "No hay solicitudes abiertas hacia tu sede en este momento.";
  }

  if (queue === "pending_approval") {
    return "No hay solicitudes pendientes por aprobar para esta sede.";
  }

  if (queue === "pending_dispatch") {
    return "No hay solicitudes aprobadas pendientes por despachar.";
  }

  if (queue === "pending_receipts") {
    return "No hay transferencias pendientes de recepción.";
  }

  return "No hay transferencias pendientes de recepción.";
}

export function TransfersListPage({
  initialQueue,
}: {
  initialQueue?: TransferPendingStage;
}) {
  const router = useRouter();
  const { loading: authLoading, permissions, user } = useAuth();
  const defaultQueue = initialQueue || "open_for_store";
  const [scope, setScope] = useState<TransferScope>("current");

  const {
    data: inbox,
    loading,
    error,
    refetch,
  } = useApiGet<TransferInboxResponse>(
    () => {
      const params = new URLSearchParams({ scope });
      return apiFetch<ApiEnvelope<TransferInboxResponse> | TransferInboxResponse>(
        `/api/transfers/inbox?${params.toString()}`,
        { cache: "no-store" }
      ).then(unwrapApiData);
    },
    [scope]
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedQueue, setSelectedQueue] = useState<TransferPendingStage>(defaultQueue);
  const [busyAction, setBusyAction] = useState<{
    transferId: string;
    action: TransferActionKey;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: TransferActionKey;
    transfer: TransferRecord;
  } | null>(null);

  const transferCapabilities = useTransferCapabilities();

  async function handleTransferAction(action: TransferActionKey, transferId: string) {
    setBusyAction({ transferId, action });
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
          : `No se pudo ejecutar la acción ${TRANSFER_ACTION_CONFIG[action].label.toLowerCase()}`
      );
    } finally {
      setBusyAction(null);
    }
  }

  const queueRows = useMemo(
    () => buildQueueRows(inbox, selectedQueue),
    [inbox, selectedQueue]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    return queueRows.filter((transfer) => matchesTransferQuery(transfer, normalizedQuery));
  }, [query, queueRows]);

  const {
    paginatedItems: paginatedTransfers,
    firstVisible,
    lastVisible,
    totalPages,
    safePage,
    setPage: setCurrentPage,
  } = usePagination(filteredRows);
  const hasActiveFilters = query !== "" || selectedQueue !== defaultQueue || scope !== "current";

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando transferencias"
        description="Validando la sede activa, las colas operativas y las acciones disponibles para cada documento."
      />
    );
  }

  if (!transferCapabilities.visible) {
    return <ForbiddenPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide" className="max-w-[1320px]">
      <PosHeader
        eyebrow="Transferencias"
        title="Transferencias"
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={appRoutes.transferHistory}>Historial</Link>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => refetch()}
                    disabled={loading}
                    className="rounded-lg"
                    aria-label="Actualizar transferencias"
                  >
                    {loading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar transferencias</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {transferCapabilities.requestCreate && (
              <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                <Link href={appRoutes.transferRequest}>
                  <Plus className="h-4 w-4" />
                  Solicitar transferencia
                </Link>
              </Button>
            )}
          </>
        }
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_0.95fr_0.95fr_auto]">
            <OpsSearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setCurrentPage(1);
              }}
              placeholder={`Buscar en ${formatTransferQueueLabel(selectedQueue).toLowerCase()} por N° o sede`}
              ariaLabel="Buscar transferencias"
            />

            <FilterDropdown
              label="Vista"
              value={selectedQueue}
              options={TRANSFER_QUEUE_OPTIONS}
              onChange={(value) => {
                setActionError(null);
                setSelectedQueue(value as TransferPendingStage);
                setCurrentPage(1);
              }}
            />

            {transferCapabilities.manage ? (
              <FilterDropdown
                label="Alcance"
                value={scope}
                options={TRANSFER_SCOPE_OPTIONS}
                onChange={(value) => {
                  setActionError(null);
                  setScope(value as TransferScope);
                  setCurrentPage(1);
                }}
                showSelectedHelper={false}
              />
            ) : (
              <div className="flex items-end">
                <div className="sales-field flex h-10 w-full items-center rounded-lg px-3 text-sm text-[var(--ops-text)]">
                  {inbox?.context.active_location?.location_name || "Sede activa"}
                </div>
              </div>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      setActionError(null);
                      setNotice(null);
                      setQuery("");
                      setSelectedQueue(defaultQueue);
                      setScope("current");
                      setCurrentPage(1);
                    }}
                    disabled={!hasActiveFilters}
                    className="rounded-lg"
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </OpsFiltersRow>

          <OpsTableWrap minWidth="1120px">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">Transferencia</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3">Actualizada</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      Cargando transferencias...
                    </td>
                  </tr>
                ) : error || actionError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6">
                      <InlineStatusCard
                        title="No pudimos cargar transferencias"
                        description={actionError || error || ""}
                        tone="danger"
                        variant="ops"
                      />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      {queueRows.length === 0
                        ? getQueueEmptyMessage(selectedQueue)
                        : "No encontramos transferencias con ese criterio."}
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((transfer) => {
                    const primaryAction = getPrimaryRowAction(selectedQueue, transfer);
                    const menuItems = buildSecondaryMenuItems(
                      transfer,
                      primaryAction,
                      router,
                      busyAction,
                      (action, record) => setPendingAction({ action, transfer: record })
                    );
                    const stateCopy = getVisibleStateCopy(transfer);
                    const units = getTransferUnitsTotal(transfer);
                    const pendingUnits = getTransferPendingUnits(transfer);
                    const happenedAt =
                      transfer.happened_at ||
                      transfer.shipped_at ||
                      transfer.updated_at ||
                      transfer.created_at;
                    const happenedAtParts = formatDateTimeParts(happenedAt);
                    const busyPrimaryAction =
                      primaryAction !== "detail" &&
                      busyAction?.transferId === transfer.transfer_id &&
                      busyAction.action === primaryAction;

                    return (
                      <tr
                        key={transfer.transfer_id}
                        className="transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="space-y-1.5">
                            <Link
                              href={`/transferencias/${transfer.transfer_id}`}
                              className="inline-flex rounded-md text-sm font-semibold text-[var(--ops-text)] transition hover:text-[var(--ripnel-accent-hover)]"
                            >
                              {transfer.transfer_number || "Sin número"}
                            </Link>
                            <p className="text-[13px] text-[var(--ops-text-muted)]">
                              {getTransferContextCopy(transfer)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">{transfer.from_location_name}</p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">{transfer.to_location_name}</p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium text-[var(--ops-text)]">{stateCopy.title}</p>
                            <p className="text-[13px] text-[var(--ops-text-muted)]">{stateCopy.subtitle}</p>
                          </div>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="text-sm text-[var(--ops-text)]">
                            {formatProductsCount(transfer.line_count)}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <p className="text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                            {units}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <p
                            className={`text-sm font-semibold tabular-nums ${
                              pendingUnits === null
                                ? "text-[var(--ops-text-muted)]"
                                : pendingUnits === 0
                                  ? "text-[color:color-mix(in_srgb,#059669_78%,var(--ops-text))]"
                                  : "text-[var(--ops-text)]"
                            }`}
                          >
                            {pendingUnits === null ? "—" : pendingUnits}
                          </p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--ops-text)]">{happenedAtParts.date}</p>
                            {happenedAtParts.time ? (
                              <p className="text-[13px] text-[var(--ops-text-muted)]">
                                {happenedAtParts.time}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                          <div className="flex justify-end gap-2">
                            {primaryAction === "detail" ? (
                              <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                                <Link href={`/transferencias/${transfer.transfer_id}`}>Ver detalle</Link>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant={primaryAction === "cancel" ? "destructive" : "accent"}
                                size="sm"
                                className="rounded-lg px-3"
                                onClick={() =>
                                  setPendingAction({ action: primaryAction, transfer })
                                }
                                disabled={busyPrimaryAction}
                              >
                                {busyPrimaryAction ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : null}
                                {TRANSFER_ACTION_CONFIG[primaryAction].label}
                              </Button>
                            )}
                            {menuItems.length > 0 ? (
                              <AdminRowActionsMenu
                                items={menuItems}
                                ariaLabel={`Acciones para ${transfer.transfer_number || "transferencia"}`}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </OpsTableWrap>

          {notice ? <AdminInlineMessage tone="success">{notice}</AdminInlineMessage> : null}

          <OpsTableFooter>
            <span className="text-sm text-[var(--ops-text-muted)]">
              {filteredRows.length === 0
                ? "0 resultados"
                : `${firstVisible}-${lastVisible} de ${filteredRows.length}`}
            </span>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="self-end md:self-auto"
            />
          </OpsTableFooter>
        </OpsTableBlock>
      </OpsSectionDivider>

      <AdminConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction.action].confirmLabel : "Confirmar acción"}
        description={
          pendingAction
            ? TRANSFER_ACTION_CONFIG[pendingAction.action].description(pendingAction.transfer)
            : ""
        }
        confirmLabel={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction.action].confirmLabel : "Confirmar"}
        confirmTone={pendingAction ? TRANSFER_ACTION_CONFIG[pendingAction.action].tone || "accent" : "accent"}
        busy={
          Boolean(
            pendingAction &&
              busyAction?.transferId === pendingAction.transfer.transfer_id &&
              busyAction.action === pendingAction.action
          )
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) {
            return;
          }

          void handleTransferAction(pendingAction.action, pendingAction.transfer.transfer_id);
          setPendingAction(null);
        }}
      />
    </OpsPageShell>
  );
}
