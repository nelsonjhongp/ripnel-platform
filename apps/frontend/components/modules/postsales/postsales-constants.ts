export {
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  SELECTED_CARD,
  CARD_BASE,
} from "@/components/ui/ops-control-styles"

import type { OpsDataTableColumn } from "@/components/ui/ops-data-table"
import { PS } from "./postsales-messages"

export const PAGE_SIZE = 10

export const EXCHANGE_REASON_PRESETS = [
  "Talla no adecuada",
  "Color reemplazado",
  "Defecto de fabrica",
  "Cambio por preferencia",
] as const

export const CANCEL_REASON_PRESETS = [
  "Venta digitada por error",
  "Cliente desistio",
  "Producto no disponible",
] as const

export const STATUS_OPTIONS = [
  { value: "all", label: PS.filters.statusOptions.all },
  { value: "confirmed", label: PS.filters.statusOptions.confirmed },
  { value: "cancelled", label: PS.filters.statusOptions.cancelled },
  { value: "draft", label: PS.filters.statusOptions.draft },
] as const

export const STATUS_TONES: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  confirmed: "success",
  cancelled: "danger",
  draft: "warning",
}

export const STATUS_LABELS: Record<string, string> = {
  confirmed: PS.table.statusLabels.confirmed,
  cancelled: PS.table.statusLabels.cancelled,
  draft: PS.table.statusLabels.draft,
}

export const CASH_TONES: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  open: "success",
  closed: "danger",
  missing: "warning",
}

export const CASH_LABELS: Record<string, string> = {
  open: PS.table.cashLabels.open,
  closed: PS.table.cashLabels.closed,
  missing: PS.table.cashLabels.missing,
}

export const PS_TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "sale", header: PS.table.columns.sale },
  { key: "date", header: PS.table.columns.date },
  { key: "customer", header: PS.table.columns.customer },
  { key: "seller", header: PS.table.columns.seller },
  { key: "location", header: PS.table.columns.location },
  { key: "status", header: PS.table.columns.status },
  { key: "total", header: PS.table.columns.total },
  { key: "postsale", header: PS.table.columns.postsale },
  { key: "actions", header: PS.table.columns.actions, className: "text-right" },
]
