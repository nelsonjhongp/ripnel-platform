export {
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
} from "@/components/ui/ops-control-styles"

import type { OpsDataTableColumn } from "@/components/ui/ops-data-table"
import { SH } from "./sales-history-messages"

export const PAGE_SIZE = 10

export const SH_TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "sale", header: SH.table.columns.sale },
  { key: "date", header: SH.table.columns.date },
  { key: "customer", header: SH.table.columns.customer },
  { key: "seller", header: SH.table.columns.seller },
  { key: "location", header: SH.table.columns.location },
  { key: "status", header: SH.table.columns.status },
  { key: "total", header: SH.table.columns.total },
  { key: "actions", header: SH.table.columns.actions, className: "text-right" },
]
