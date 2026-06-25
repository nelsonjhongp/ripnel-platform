import { Banknote, ArrowRightLeft, Smartphone } from "lucide-react"

import {
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
} from "@/components/ui/ops-control-styles"

import type { OpsDataTableColumn } from "@/components/ui/ops-data-table"

import { CAJA } from "./cash-messages"

export {
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
}

export const METHOD_CONFIG = [
  { key: "cash" as const, icon: Banknote },
  { key: "yape" as const, icon: Smartphone },
  { key: "plin" as const, icon: Smartphone },
  { key: "transfer" as const, icon: ArrowRightLeft },
]

export const ADMIN_PAGE_SIZE = 20
export const HISTORY_PAGE_SIZE = 10

export const HISTORY_TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "fecha", header: CAJA.history.table.date },
  { key: "abrio", header: CAJA.history.table.openedBy },
  { key: "cerro", header: CAJA.history.table.closedBy },
  { key: "total", header: CAJA.history.table.total },
  { key: "accion", header: CAJA.history.table.action, className: "text-right" },
]

export const CONTROL_TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "fecha", header: CAJA.admin.table.dateStatus },
  { key: "sede", header: CAJA.admin.table.location },
  { key: "movimiento", header: CAJA.admin.table.openClose },
  { key: "total", header: CAJA.admin.table.total },
  { key: "accion", header: CAJA.admin.table.action, className: "text-right" },
]
