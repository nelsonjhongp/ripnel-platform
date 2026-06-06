export type Location = {
  location_id: string;
  code: string;
  name: string;
  type?: string | null;
  address?: string | null;
  active?: boolean;
  is_default?: boolean;
};

export type AdjustmentStatus = "draft" | "confirmed" | "cancelled";
export type AdjustmentIntent = "opening" | "adjustment";

export type AdjustmentSummary = {
  adjustment_id: string;
  adjustment_number: string;
  location_id: string;
  location_code: string;
  location_name: string;
  status: AdjustmentStatus;
  intent_type?: AdjustmentIntent | null;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  line_count: number;
};

export type AdjustmentLine = {
  adjustment_line_id: string;
  adjustment_id: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
  counted_qty: number;
  difference_qty: number;
  notes: string | null;
};

export type AdjustmentDetail = AdjustmentSummary & {
  lines: AdjustmentLine[];
};

export type AdjustmentCollectionMeta = {
  available_locations: Location[];
  selected_location_id: string | null;
  can_view_all_locations: boolean;
};

export type AdjustmentListData = {
  rows: AdjustmentSummary[];
  meta: AdjustmentCollectionMeta;
};

export type AdjustmentDetailData = {
  adjustment: AdjustmentDetail;
  meta: AdjustmentCollectionMeta;
};

export type AdjustmentVariantsData = {
  rows: AdjustmentVariant[];
  meta: AdjustmentCollectionMeta;
};

export type AdjustmentVariant = {
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
};

export type DraftAdjustmentLine = AdjustmentVariant & {
  counted_qty: number;
};

export function inferAdjustmentIntent(reason: string | null | undefined): AdjustmentIntent {
  return /apertura|inicial/i.test(String(reason || "")) ? "opening" : "adjustment";
}

export function resolveAdjustmentIntent(value: {
  intent_type?: AdjustmentIntent | null;
  reason?: string | null;
} | string | null | undefined): AdjustmentIntent {
  if (value && typeof value === "object") {
    if (value.intent_type === "opening" || value.intent_type === "adjustment") {
      return value.intent_type;
    }

    return inferAdjustmentIntent(value.reason);
  }

  return inferAdjustmentIntent(value);
}

export function formatAdjustmentIntent(intent: AdjustmentIntent) {
  return intent === "opening" ? "Apertura inicial" : "Ajuste de inventario";
}

export function buildAdjustmentReason(intent: AdjustmentIntent, rawReason: string) {
  const normalized = rawReason.trim();

  if (intent === "opening") {
    if (!normalized) {
      return "Apertura inicial";
    }

    return /^apertura/i.test(normalized) ? normalized : `Apertura inicial - ${normalized}`;
  }

  if (!normalized) {
    return "Ajuste por conteo";
  }

  return normalized;
}

export { formatDateTime as formatAdjustmentDateTime } from "@/lib/date-utils"

export function formatAdjustmentStatus(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  return "Borrador";
}

export function getAdjustmentStatusClasses(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]";
  }

  if (status === "cancelled") {
    return "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]";
  }

  return "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]";
}

export function getAdjustmentDifferenceClasses(value: number) {
  if (value > 0) {
    return "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]";
  }

  if (value < 0) {
    return "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]";
  }

  return "text-[var(--ops-text-muted)]";
}
