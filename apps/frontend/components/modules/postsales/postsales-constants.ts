export {
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
} from "@/components/ui/ops-control-styles"

import type { OpsDataTableColumn } from "@/components/ui/ops-data-table"

export const PS_TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "sale", header: "Venta" },
  { key: "date", header: "Fecha" },
  { key: "customer", header: "Cliente" },
  { key: "location", header: "Sede" },
  { key: "status", header: "Estado" },
  { key: "total", header: "Total" },
  { key: "postsale", header: "Postventa" },
  { key: "actions", header: "", className: "text-right" },
]
