import {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  SURFACE_MUTED_BG,
  INFO_BOX_MUTED,
} from "../../ui/ops-control-styles"

export {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  SURFACE_MUTED_BG,
  INFO_BOX_MUTED,
}

/* Status dot classes — mapped to ops-tone tokens instead of inline color-mix */
export const STATUS_DOT_INACTIVE =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-neutral-bg)] border-[var(--ops-tone-neutral-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-neutral-text)]"
export const STATUS_DOT_DRAFT =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-neutral-bg)] border-[var(--ops-tone-neutral-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-neutral-text)]"
export const STATUS_DOT_PENDING_VARIANTS =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-warning-bg)] border-[var(--ops-tone-warning-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-warning-text)]"
export const STATUS_DOT_PENDING_PRICES =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-danger-bg)] border-[var(--ops-tone-danger-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-danger-text)]"
export const STATUS_DOT_READY_NO_STOCK =
  "inline-flex items-center gap-1.5 rounded-full border bg-[color:color-mix(in_srgb,#3b82f6_14%,var(--ops-surface))] border-[color:color-mix(in_srgb,#3b82f6_34%,var(--ops-border-strong))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#2563eb_74%,var(--ops-text))]"
export const STATUS_DOT_READY =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-success-bg)] border-[var(--ops-tone-success-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-success-text)]"

/* Warning chip classes */
export const WARNING_CHIP_WHOLESALE =
  "inline-flex items-center gap-1 rounded-full border bg-[var(--ops-tone-warning-bg)] border-[var(--ops-tone-warning-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-tone-warning-text)]"
export const WARNING_CHIP_STOCK_NO_RETAIL =
  "inline-flex items-center gap-1 rounded-full border bg-[var(--ops-tone-danger-bg)] border-[var(--ops-tone-danger-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-tone-danger-text)]"

/* Duplicate warning text */
export const DUPLICATE_WARNING_TEXT = "text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"

/* Message box styles */
export const MSG_BOX_VARIANTS_ERROR =
  "rounded-lg border bg-[var(--ops-tone-danger-bg)] border-[var(--ops-tone-danger-border)] px-4 py-3 text-sm text-[var(--ops-tone-danger-text)]"
export const MSG_BOX_VARIANTS_SUCCESS =
  "rounded-lg border bg-[var(--ops-tone-success-bg)] border-[var(--ops-tone-success-border)] px-4 py-3 text-sm text-[var(--ops-tone-success-text)]"

/* Variant warning chip classes (variants-page) */
export const VARIANT_WARNING_DANGER =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-danger-bg)] border-[var(--ops-tone-danger-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-danger-text)]"
export const VARIANT_WARNING_WARNING =
  "inline-flex items-center gap-1.5 rounded-full border bg-[var(--ops-tone-warning-bg)] border-[var(--ops-tone-warning-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-tone-warning-text)]"

/* Unique color toggle label background */
export const UNIQUE_COLOR_LABEL = SURFACE_MUTED_BG
