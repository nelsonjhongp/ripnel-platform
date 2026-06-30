export {
  SURFACE_MUTED_BG,
  SURFACE_MUTED_30,
  SURFACE_MUTED_52,
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
} from "@/components/ui/ops-control-styles"

/** Badge de consistencia — caja cuadra (success) */
export const CASH_CONSISTENT_BADGE =
  "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"

/** Badge de inconsistencia — revisar diferencia (warning) */
export const CASH_INCONSISTENT_BADGE =
  "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"

/** Badge neutro — sin resumen de caja */
export const CASH_NO_SUMMARY_BADGE =
  "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
