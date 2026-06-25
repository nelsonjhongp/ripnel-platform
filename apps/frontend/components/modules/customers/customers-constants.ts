export {
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  opsControlClassName,
  opsInputCompact,
} from "@/components/ui/ops-control-styles"

export const DOC_TYPE_LABELS: Record<string, string> = {
  none: "Sin doc.",
  dni: "DNI",
  ruc: "RUC",
  ce: "CE",
  passport: "Pasaporte",
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  retail: "Retail",
  wholesale: "Mayorista",
}

export const DOC_RULES: Record<string, { label: string; regex: RegExp }> = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
}
