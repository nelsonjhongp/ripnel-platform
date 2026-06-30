import type { ReactNode } from "react"
import {
  CheckCheck,
  SendHorizonal,
  ShieldCheck,
  X,
} from "lucide-react"
import { TRANS } from "./transfers-messages"
import {
  TRANS_STATUS_REQUESTED,
  TRANS_STATUS_APPROVED,
  TRANS_STATUS_SHIPPED,
  TRANS_STATUS_RECEIVED,
  TRANS_STATUS_CANCELLED,
  TRANS_QUEUE_SELECTED,
  TRANS_QUEUE_RECEIPT,
  TRANS_QUEUE_DEFAULT,
  TRANS_STAGE_OPEN,
  TRANS_STAGE_APPROVAL,
  TRANS_STAGE_DISPATCH,
  TRANS_STAGE_RECEIPT,
} from "./transfers-constants"

export type TransferStatus = "requested" | "approved" | "shipped" | "received" | "cancelled";
export type TransferScope = "current" | "network";
export type TransferScopeRole = "source" | "destination" | "observer" | "network";
export type TransferNextStep = "approval" | "dispatch" | "receipt" | "completed" | "cancelled";
export type TransferQueueKey =
  | "open_for_store"
  | "pending_approval"
  | "pending_dispatch"
  | "pending_receipts";
export type TransferPendingStage = TransferQueueKey;

export type TransferLocationRef = {
  location_id: string;
  location_code: string | null;
  location_name: string;
  scope_role: "source" | "destination";
};

export type TransferAvailableActions = {
  approve: boolean;
  ship: boolean;
  receive: boolean;
  cancel: boolean;
};

export type TransferSummary = {
  transfer_id: string;
  transfer_number: string | null;
  from_location_id: string;
  from_location_code: string;
  from_location_name: string;
  to_location_id: string;
  to_location_code: string;
  to_location_name: string;
  status: TransferStatus;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  shipped_by: string | null;
  shipped_by_name: string | null;
  received_by: string | null;
  received_by_name: string | null;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
  created_at: string;
  approved_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  line_count: number;
  qty_requested_total: number;
  qty_shipped_total: number;
  qty_received_total: number;
  scope_role: TransferScopeRole;
  next_step: TransferNextStep;
  next_owner: TransferLocationRef | null;
  available_actions: TransferAvailableActions;
  primary_action: keyof TransferAvailableActions | null;
  active_message: string;
};

export type TransferInboxItem = TransferSummary & {
  pending_stage: TransferPendingStage;
  happened_at: string;
};

export type TransferLineDetail = {
  transfer_line_id: string;
  transfer_id: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  qty_requested: number;
  qty_shipped: number;
  qty_received: number;
  notes: string | null;
};

export type TransferDetail = Omit<
  TransferSummary,
  "line_count" | "qty_requested_total" | "qty_shipped_total" | "qty_received_total"
> & {
  active_location: {
    location_id: string;
    location_code: string | null;
    location_name: string;
    location_type: string;
  } | null;
  lines: TransferLineDetail[];
};

export type TransferInboxResponse = {
  context: {
    scope: TransferScope;
    can_view_network: boolean;
    active_location: {
      location_id: string;
      location_code: string | null;
      location_name: string;
      location_type: string;
    } | null;
    location_ids: string[];
  };
  counts: {
    open_for_store_count: number;
    pending_approval_count: number;
    pending_dispatch_count: number;
    pending_receipts_count: number;
  };
  totals: {
    active_total: number;
  };
  queues: Record<TransferPendingStage, TransferInboxItem[]>;
};

export const TRANSFER_SCOPE_OPTIONS: ReadonlyArray<{
  value: TransferScope;
  label: string;
  helper: string;
}> = [
  {
    value: "current",
    label: TRANS.scope.current,
    helper: TRANS.scope.currentHelper,
  },
  {
    value: "network",
    label: TRANS.scope.network,
    helper: TRANS.scope.networkHelper,
  },
];

export const TRANSFER_QUEUE_OPTIONS: ReadonlyArray<{
  value: TransferQueueKey;
  label: string;
}> = [
  { value: "open_for_store", label: TRANS.queue.openForStore },
  { value: "pending_approval", label: TRANS.queue.pendingApproval },
  { value: "pending_dispatch", label: TRANS.queue.pendingDispatch },
  { value: "pending_receipts", label: TRANS.queue.pendingReceipts },
];

export function formatTransferStatus(status: TransferStatus) {
  switch (status) {
    case "requested": return TRANS.status.requested;
    case "approved": return TRANS.status.approved;
    case "shipped": return TRANS.status.shipped;
    case "received": return TRANS.status.received;
    default: return TRANS.status.cancelled;
  }
}

export function formatTransferQueueLabel(queue: TransferQueueKey) {
  return TRANSFER_QUEUE_OPTIONS.find((option) => option.value === queue)?.label || "Transferencias";
}

export function formatTransferQueueShortLabel(queue: TransferQueueKey) {
  switch (queue) {
    case "open_for_store": return TRANS.queue.openForStoreShort;
    case "pending_approval": return TRANS.queue.pendingApprovalShort;
    case "pending_dispatch": return TRANS.queue.pendingDispatchShort;
    case "pending_receipts": return TRANS.queue.pendingReceiptsShort;
  }
}

export function formatTransferPendingStage(stage: TransferPendingStage) {
  switch (stage) {
    case "open_for_store": return TRANS.queue.openForStoreStage;
    case "pending_approval": return TRANS.queue.pendingApprovalStage;
    case "pending_dispatch": return TRANS.queue.pendingDispatchStage;
    case "pending_receipts": return TRANS.queue.pendingReceiptsStage;
  }
}

export function formatTransferNextStep(nextStep: TransferNextStep) {
  switch (nextStep) {
    case "approval": return TRANS.nextStep.approval;
    case "dispatch": return TRANS.nextStep.dispatch;
    case "receipt": return TRANS.nextStep.receipt;
    case "completed": return TRANS.nextStep.completed;
    default: return TRANS.nextStep.cancelled;
  }
}

export function formatTransferPrimaryAction(action: keyof TransferAvailableActions | null) {
  switch (action) {
    case "approve": return TRANS.primaryAction.approve;
    case "ship": return TRANS.primaryAction.ship;
    case "receive": return TRANS.primaryAction.receive;
    case "cancel": return TRANS.primaryAction.cancel;
    default: return TRANS.primaryAction.viewDetail;
  }
}

export function formatTransferScopeRole(scopeRole: TransferScopeRole) {
  switch (scopeRole) {
    case "source": return TRANS.scope.source;
    case "destination": return TRANS.scope.destination;
    case "network": return TRANS.scope.network;
    default: return TRANS.scope.observer;
  }
}

export function getTransferStatusClasses(status: TransferStatus) {
  switch (status) {
    case "requested": return TRANS_STATUS_REQUESTED;
    case "approved": return TRANS_STATUS_APPROVED;
    case "shipped": return TRANS_STATUS_SHIPPED;
    case "received": return TRANS_STATUS_RECEIVED;
    default: return TRANS_STATUS_CANCELLED;
  }
}

export function getTransferQueueClasses(queue: TransferQueueKey, selected: boolean) {
  if (selected) return TRANS_QUEUE_SELECTED;
  if (queue === "pending_receipts") return TRANS_QUEUE_RECEIPT;
  return TRANS_QUEUE_DEFAULT;
}

export function getTransferPendingStageClasses(stage: TransferPendingStage) {
  switch (stage) {
    case "open_for_store": return TRANS_STAGE_OPEN;
    case "pending_approval": return TRANS_STAGE_APPROVAL;
    case "pending_dispatch": return TRANS_STAGE_DISPATCH;
    case "pending_receipts": return TRANS_STAGE_RECEIPT;
  }
}

export function getTransferQueueCount(inbox: TransferInboxResponse["counts"], queue: TransferQueueKey) {
  if (queue === "open_for_store") return Number(inbox.open_for_store_count || 0);
  if (queue === "pending_approval") return Number(inbox.pending_approval_count || 0);
  if (queue === "pending_dispatch") return Number(inbox.pending_dispatch_count || 0);
  return Number(inbox.pending_receipts_count || 0);
}

export type RequestCandidateSource = {
  location_id: string
  location_code: string
  location_name: string
  qty_available: number
}

export type RequestCandidate = {
  variant_id: string
  sku: string
  style_code: string
  style_name: string
  garment_type_name: string | null
  size_code: string
  color_name: string
  total_available: number
  candidate_sources: RequestCandidateSource[]
}

export type RequestProductVariant = {
  variant_id: string
  sku: string
  size_code: string
  color_name: string
  total_available: number
  candidate_sources: RequestCandidateSource[]
}

export type RequestProductGroup = {
  product_key: string
  style_code: string
  style_name: string
  garment_type_name: string | null
  secondary_code: string
  total_available: number
  variants: RequestProductVariant[]
}

export type DraftLine = {
  location_id: string
  location_code: string
  location_name: string
  variant_id: string
  sku: string
  style_code: string
  style_name: string
  garment_type_name: string | null
  size_code: string
  color_name: string
  qty: number
  qty_requested: number
}

export type RequestLocationOption = {
  value: string
  label: string
  type?: string | null
}

export type TransferActionKey = "approve" | "ship" | "receive" | "cancel"

export type TransferActionConfig<T = TransferSummary> = {
  label: string
  confirmLabel: string
  successMessage: string
  busyMessage?: string
  path: (transferId: string) => string
  icon: ReactNode
  tone: "danger" | "accent" | "neutral"
  description: (transfer: T) => ReactNode
}

export const TRANSFER_ACTION_CONFIG: Record<
  TransferActionKey,
  TransferActionConfig
> = {
  approve: {
    label: TRANS.actionConfig.approve.label,
    confirmLabel: TRANS.actionConfig.approve.confirmLabel,
    successMessage: TRANS.actionConfig.approve.success,
    busyMessage: TRANS.actionConfig.approve.busy,
    path: (transferId) => `/api/transfers/${transferId}/approve`,
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin numero"}</strong> quedara lista
        para despacho desde <strong>{transfer.from_location_name}</strong>.
      </>
    ),
  },
  ship: {
    label: TRANS.actionConfig.ship.label,
    confirmLabel: TRANS.actionConfig.ship.confirmLabel,
    successMessage: TRANS.actionConfig.ship.success,
    busyMessage: TRANS.actionConfig.ship.busy,
    path: (transferId) => `/api/transfers/${transferId}/ship`,
    icon: <SendHorizonal className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin numero"}</strong> descontara
        stock del origen y quedara lista para recepcion en{" "}
        <strong>{transfer.to_location_name}</strong>.
      </>
    ),
  },
  receive: {
    label: TRANS.actionConfig.receive.label,
    confirmLabel: TRANS.actionConfig.receive.confirmLabel,
    successMessage: TRANS.actionConfig.receive.success,
    busyMessage: TRANS.actionConfig.receive.busy,
    path: (transferId) => `/api/transfers/${transferId}/receive`,
    icon: <CheckCheck className="h-3.5 w-3.5" />,
    tone: "accent",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin numero"}</strong> ingresara
        stock en <strong>{transfer.to_location_name}</strong>.
      </>
    ),
  },
  cancel: {
    label: TRANS.actionConfig.cancel.label,
    confirmLabel: TRANS.actionConfig.cancel.confirmLabel,
    successMessage: TRANS.actionConfig.cancel.success,
    busyMessage: TRANS.actionConfig.cancel.busy,
    path: (transferId) => `/api/transfers/${transferId}/cancel`,
    icon: <X className="h-3.5 w-3.5" />,
    tone: "danger",
    description: (transfer) => (
      <>
        La transferencia <strong>{transfer.transfer_number || "sin numero"}</strong> quedara
        anulada y no continuara el flujo entre sedes.
      </>
    ),
  },
}
