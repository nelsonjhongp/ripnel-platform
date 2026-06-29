import { ADJ } from "./adjustments-messages";
import {
  CHIP_DRAFT,
  CHIP_CONFIRMED,
  CHIP_CANCELLED,
  DIFF_POSITIVE,
  DIFF_NEGATIVE,
  DIFF_ZERO,
} from "./adjustments-constants";

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

export type GroupedAdjustmentStyle = {
  styleId: string;
  styleCode: string;
  styleName: string;
  totalSystemQty: number;
  variants: AdjustmentVariant[];
};

export function groupAdjustmentVariantsByStyle(
  variants: AdjustmentVariant[]
): GroupedAdjustmentStyle[] {
  const map = new Map<string, GroupedAdjustmentStyle>();

  for (const v of variants) {
    const key = v.style_code;
    if (!map.has(key)) {
      map.set(key, {
        styleId: key,
        styleCode: v.style_code,
        styleName: v.style_name,
        totalSystemQty: 0,
        variants: [],
      });
    }
    const group = map.get(key)!;
    group.variants.push(v);
    group.totalSystemQty += v.system_qty;
  }

  return Array.from(map.values());
}

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
  return intent === "opening" ? ADJ.intent.opening : ADJ.intent.adjustment;
}

export function buildAdjustmentReason(intent: AdjustmentIntent, rawReason: string) {
  const normalized = rawReason.trim();

  if (intent === "opening") {
    if (!normalized) {
      return ADJ.intent.opening;
    }

    return /^apertura/i.test(normalized) ? normalized : `${ADJ.intent.opening} - ${normalized}`;
  }

  if (!normalized) {
    return ADJ.list.fallbackReason;
  }

  return normalized;
}

export { formatDateTime as formatAdjustmentDateTime } from "@/lib/date-utils"

export function formatAdjustmentStatus(status: AdjustmentStatus) {
  if (status === "confirmed") return ADJ.status.confirmed;
  if (status === "cancelled") return ADJ.status.cancelled;
  return ADJ.status.draft;
}

export function getAdjustmentStatusClasses(status: AdjustmentStatus) {
  if (status === "confirmed") return CHIP_CONFIRMED;
  if (status === "cancelled") return CHIP_CANCELLED;
  return CHIP_DRAFT;
}

export function getAdjustmentDifferenceClasses(value: number) {
  if (value > 0) return DIFF_POSITIVE;
  if (value < 0) return DIFF_NEGATIVE;
  return DIFF_ZERO;
}
