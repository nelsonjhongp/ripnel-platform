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
    label: "Sede activa",
    helper: "Enfoca solicitudes y acciones en la sede seleccionada.",
  },
  {
    value: "network",
    label: "Red asignada",
    helper: "Amplía la vista a todas las sedes asignadas a tu usuario.",
  },
];

export const TRANSFER_QUEUE_OPTIONS: ReadonlyArray<{
  value: TransferQueueKey;
  label: string;
}> = [
  { value: "open_for_store", label: "Abiertas para mi sede" },
  { value: "pending_approval", label: "Por aprobar" },
  { value: "pending_dispatch", label: "Por despachar" },
  { value: "pending_receipts", label: "Por recibir" },
];

export function formatTransferStatus(status: TransferStatus) {
  if (status === "requested") {
    return "Solicitada";
  }

  if (status === "approved") {
    return "Aprobada";
  }

  if (status === "shipped") {
    return "Despachada";
  }

  if (status === "received") {
    return "Recibida";
  }

  return "Cancelada";
}

export function formatTransferQueueLabel(queue: TransferQueueKey) {
  return TRANSFER_QUEUE_OPTIONS.find((option) => option.value === queue)?.label || "Transferencias";
}

export function formatTransferQueueShortLabel(queue: TransferQueueKey) {
  if (queue === "open_for_store") return "Abiertas";
  if (queue === "pending_approval") return "Aprobar";
  if (queue === "pending_dispatch") return "Despachar";
  return "Recibir";
}

export function formatTransferPendingStage(stage: TransferPendingStage) {
  if (stage === "open_for_store") return "Abierta";
  if (stage === "pending_approval") return "Por aprobar";
  if (stage === "pending_dispatch") return "Por despachar";
  return "Por recibir";
}

export function formatTransferNextStep(nextStep: TransferNextStep) {
  if (nextStep === "approval") return "Aprobación";
  if (nextStep === "dispatch") return "Despacho";
  if (nextStep === "receipt") return "Recepción";
  if (nextStep === "completed") return "Completada";
  return "Cancelada";
}

export function formatTransferPrimaryAction(action: keyof TransferAvailableActions | null) {
  if (action === "approve") return "Aprobar";
  if (action === "ship") return "Despachar";
  if (action === "receive") return "Recepcionar";
  if (action === "cancel") return "Cancelar";
  return "Ver detalle";
}

export function formatTransferScopeRole(scopeRole: TransferScopeRole) {
  if (scopeRole === "source") return "Origen";
  if (scopeRole === "destination") return "Destino";
  if (scopeRole === "network") return "Red";
  return "Seguimiento";
}

export function getTransferStatusClasses(status: TransferStatus) {
  if (status === "requested") {
    return "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text-muted)]";
  }

  if (status === "approved") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_86%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]";
  }

  if (status === "shipped") {
    return "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]";
  }

  if (status === "received") {
    return "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]";
  }

  return "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]";
}

export function getTransferQueueClasses(queue: TransferQueueKey, selected: boolean) {
  if (selected) {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]";
  }

  if (queue === "pending_receipts") {
    return "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[color:color-mix(in_srgb,#b45309_82%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))]";
  }

  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]";
}

export function getTransferPendingStageClasses(stage: TransferPendingStage) {
  if (stage === "open_for_store") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]";
  }

  if (stage === "pending_approval") {
    return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
  }

  if (stage === "pending_dispatch") {
    return "border-[color:color-mix(in_srgb,#f59e0b_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_80%,var(--ops-text))]";
  }

  return "border-[color:color-mix(in_srgb,#10b981_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#047857_84%,var(--ops-text))]";
}

export function getTransferQueueCount(inbox: TransferInboxResponse["counts"], queue: TransferQueueKey) {
  if (queue === "open_for_store") return Number(inbox.open_for_store_count || 0);
  if (queue === "pending_approval") return Number(inbox.pending_approval_count || 0);
  if (queue === "pending_dispatch") return Number(inbox.pending_dispatch_count || 0);
  return Number(inbox.pending_receipts_count || 0);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
