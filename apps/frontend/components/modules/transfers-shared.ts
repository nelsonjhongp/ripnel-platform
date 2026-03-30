export type TransferStatus = "draft" | "shipped" | "received" | "cancelled";

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
  shipped_by: string | null;
  shipped_by_name: string | null;
  received_by: string | null;
  received_by_name: string | null;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
  created_at: string;
  shipped_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  line_count: number;
  qty_requested_total: number;
  qty_shipped_total: number;
  qty_received_total: number;
};

export function formatTransferStatus(status: TransferStatus) {
  if (status === "draft") {
    return "Borrador";
  }

  if (status === "shipped") {
    return "Enviada";
  }

  if (status === "received") {
    return "Recibida";
  }

  return "Cancelada";
}

export function getTransferStatusClasses(status: TransferStatus) {
  if (status === "draft") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "shipped") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "received") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-rose-100 text-rose-700";
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
