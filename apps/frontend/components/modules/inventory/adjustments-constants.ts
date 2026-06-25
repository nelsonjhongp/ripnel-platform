export {
  INFO_BOX,
  INFO_BOX_MUTED,
  INFO_BOX_XL,
  SURFACE_MUTED_BG,
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CHIP_TONE_ACCENT,
  CHIP_TONE_NEUTRAL,
  opsFieldLabelClassName,
  opsInputCompact as INPUT_CLASS,
} from "@/components/ui/ops-control-styles";

/** Chip semantico — estado borrador (amber) */
export const CHIP_DRAFT =
  "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]";

/** Chip semantico — estado confirmado (green) */
export const CHIP_CONFIRMED =
  "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]";

/** Chip semantico — estado cancelado (red) */
export const CHIP_CANCELLED =
  "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]";

/** Texto de diferencia positiva (green) */
export const DIFF_POSITIVE =
  "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]";

/** Texto de diferencia negativa (red) */
export const DIFF_NEGATIVE =
  "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]";

/** Texto de diferencia cero (muted) */
export const DIFF_ZERO = "text-[var(--ops-text-muted)]";

/** Chip de intencion — apertura (accent violet) */
export const CHIP_INTENT_OPENING =
  "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]";

/** Chip de intencion — ajuste (neutral) */
export const CHIP_INTENT_ADJUSTMENT =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
