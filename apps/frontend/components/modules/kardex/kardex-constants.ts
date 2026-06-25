export {
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CARD_BASE,
  INFO_BOX_XL,
  INFO_BOX,
  INFO_BOX_MUTED,
  SELECTED_CARD,
  SURFACE_MUTED_BG,
} from "@/components/ui/ops-control-styles"

/** Chip verde — entrada de stock */
export const CHIP_ENTRY =
  "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]"

/** Chip ambar — salida de stock */
export const CHIP_EXIT =
  "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]"

/** Chip muted — ajuste */
export const CHIP_ADJUST =
  "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text-muted)]"

/** Texto verde — cantidad positiva */
export const QTY_POSITIVE =
  "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]"

/** Texto rojo — cantidad negativa */
export const QTY_NEGATIVE =
  "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]"
