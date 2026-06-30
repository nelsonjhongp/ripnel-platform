import {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  INFO_BOX,
  INFO_BOX_MUTED,
  SURFACE_MUTED_BG,
  SELECTED_CARD,
  CARD_BASE,
} from "../../ui/ops-control-styles"

export {
  opsControlClassName,
  opsInputCompact,
  opsFieldLabelClassName,
  INFO_BOX,
  INFO_BOX_MUTED,
  SURFACE_MUTED_BG,
  SELECTED_CARD,
  CARD_BASE,
}

/* Coverage bar colors use ops-tone tokens */
export const COVERAGE_BAR_DANGER = "bg-[var(--ops-tone-danger-bg)]"
export const COVERAGE_BAR_WARNING = "bg-[var(--ops-tone-warning-bg)]"
export const COVERAGE_BAR_SUCCESS = "bg-[var(--ops-tone-success-bg)]"

/* Highlight panel for workspace selected row */
export const WORKSPACE_SELECTED_ROW = "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,var(--ops-surface))]"

/* Message box styles — success */
export const MSG_BOX_SUCCESS =
  "border border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"

/* Message box styles — error */
export const MSG_BOX_ERROR =
  "border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]"

/* Empty state surface */
export const EMPTY_STATE_SURFACE = "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))]"
