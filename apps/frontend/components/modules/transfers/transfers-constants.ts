import {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CHIP_DRAFT,
  CHIP_CONFIRMED,
  CHIP_CANCELLED,
} from "../../ui/ops-control-styles"

export {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CHIP_DRAFT,
  CHIP_CONFIRMED,
  CHIP_CANCELLED,
}

/* Status badge classes for transfers — mapped to ops-tone tokens */
export const TRANS_STATUS_REQUESTED =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
export const TRANS_STATUS_APPROVED =
  "border-[var(--ops-tone-accent-border)] bg-[var(--ops-tone-accent-bg)] text-[var(--ripnel-accent-hover)]"
export const TRANS_STATUS_SHIPPED =
  "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
export const TRANS_STATUS_RECEIVED =
  "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"
export const TRANS_STATUS_CANCELLED =
  "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]"

/* Queue selector classes */
export const TRANS_QUEUE_SELECTED =
  "border-[var(--ops-tone-accent-border)] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
export const TRANS_QUEUE_RECEIPT =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-tone-warning-text)]"
export const TRANS_QUEUE_DEFAULT =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]"

/* Pending stage classes */
export const TRANS_STAGE_OPEN =
  "border-[var(--ops-tone-accent-border)] bg-[var(--ops-tone-accent-bg)] text-[var(--ripnel-accent-hover)]"
export const TRANS_STAGE_APPROVAL =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
export const TRANS_STAGE_DISPATCH =
  "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
export const TRANS_STAGE_RECEIPT =
  "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"
