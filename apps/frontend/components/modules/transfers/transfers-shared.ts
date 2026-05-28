export type TransferStatus = "requested" | "approved" | "shipped" | "received" | "cancelled";
export type TransferStatusFilter = "all" | TransferStatus;

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
  lines: TransferLineDetail[];
};

export const TRANSFER_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: TransferStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "requested", label: "Solicitadas" },
  { value: "approved", label: "Aprobadas" },
  { value: "shipped", label: "Despachadas" },
  { value: "received", label: "Recepcionadas" },
  { value: "cancelled", label: "Canceladas" },
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
    return "Recepcionada";
  }

  return "Cancelada";
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
