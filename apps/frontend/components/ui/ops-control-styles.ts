export const opsControlClassName =
  "sales-field h-9 w-full rounded-lg px-3 py-2 text-sm text-[var(--ops-text)] outline-none transition placeholder:text-[color:color-mix(in_srgb,var(--ops-text-muted)_92%,transparent)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] hover:bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_40%,var(--ops-surface))] focus-visible:border-[var(--ripnel-accent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] disabled:opacity-60 aria-invalid:border-[var(--ops-tone-danger-border)] aria-invalid:bg-[var(--ops-tone-danger-bg)]"

export const opsSelectTriggerClassName =
  `${opsControlClassName} flex cursor-pointer items-center justify-between py-0 text-left`

export const opsDropdownContentClassName =
  "max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 ring-0"

export const opsSelectContentClassName =
  "z-[60] max-h-64 w-[var(--radix-select-trigger-width)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 ring-0 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

export const opsSelectOptionClassName =
  "cursor-pointer gap-2 rounded-lg pl-2 pr-7 py-2 focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)] data-[state=checked]:bg-[var(--ripnel-accent-soft)] data-[state=checked]:text-[var(--ripnel-accent-hover)]"

export const opsFieldLabelClassName =
  "block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"

export const opsFormLabelClassName =
  "block text-[13px] font-medium leading-none text-[var(--ops-text)]"

/** Input compacto h-9 para formularios operativos */
export const opsInputCompact = opsControlClassName

/** Panel informativo standard: borde, fondo surface, padding compacto */
export const INFO_BOX =
  "rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2.5"

/** Panel informativo con fondo muted */
export const INFO_BOX_MUTED =
  "rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2.5"

/** Panel informativo con esquinas mas redondeadas (xl) */
export const INFO_BOX_XL =
  "rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2.5"

/** Fondo muted semitransparente para secciones secundarias */
export const SURFACE_MUTED_BG =
  "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))]"

/** Fondo muted muy sutil (30%) — contenedores de prioridades y tablas home */
export const SURFACE_MUTED_30 =
  "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]"

/** Fondo muted moderado (52%) — tarjetas de ultima venta */
export const SURFACE_MUTED_52 =
  "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_52%,var(--ops-surface))]"

/** Fondo muted suave (24%) — sub-paneles dentro de cards de operacion */
export const SURFACE_MUTED_24 =
  "bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_24%,var(--ops-surface))]"

/** Panel destacado con borde y fondo en tono acento — para totales */
export const ACCENT_HIGHLIGHT_PANEL =
  "rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))]"

/** Color de texto acento para labels dentro de paneles destacados */
export const ACCENT_LABEL_TEXT =
  "text-[color:color-mix(in_srgb,var(--ripnel-accent)_78%,var(--ops-text))]"

/** Tarjeta seleccionable en estado activo — borde y fondo acento */
export const SELECTED_CARD =
  "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))]"

/** Tarjeta seleccionable en estado por defecto */
export const CARD_BASE =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] hover:bg-[var(--ops-surface)]"

/** Borde con acento suave — hover de botones e inputs */
export const ACCENT_HOVER_BORDER =
  "[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))]"

/** Borde semitransparente para tarjetas de pago mixto */
export const SUBTLE_BORDER =
  "[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)]"

/** Fondo muted muy sutil para lineas de pago mixto */
export const SUBTLE_MUTED_SURFACE =
  "[color:color-mix(in_srgb,var(--ops-surface-muted)_28%,var(--ops-surface))]"

/** Fondo muted moderado para estados intermedios */
export const MUTED_SURFACE_MIX =
  "[color:color-mix(in_srgb,var(--ops-surface-muted)_58%,var(--ops-surface))]"

/** Fondo con acento suave para paneles destacados secundarios */
export const ACCENT_MUTED_BG =
  "[color:color-mix(in_srgb,var(--ripnel-accent-soft)_68%,var(--ops-surface))]"

/** Chip semantico con tono acento */
export const CHIP_TONE_ACCENT =
  "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"

/** Chip semantico con tono neutral */
export const CHIP_TONE_NEUTRAL =
  "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]"

/** Pill de tipo de cliente en tablas */
export const CUSTOMER_TYPE_PILL =
  "inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]"

/** Chip semantico — estado borrador (amber) — inventory adjustments */
export const CHIP_DRAFT =
  "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"

/** Chip semantico — estado confirmado (green) — inventory adjustments */
export const CHIP_CONFIRMED =
  "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]"

/** Chip semantico — estado cancelado (red) — inventory adjustments */
export const CHIP_CANCELLED =
  "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"

/** Chip semantico — salida de stock (amber suave) — kardex */
export const CHIP_EXIT =
  "border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_72%,var(--ops-text))]"

/** Texto de diferencia positiva (green) — inventory adjustments */
export const DIFF_POSITIVE =
  "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]"

/** Texto de diferencia negativa (red) — inventory adjustments */
export const DIFF_NEGATIVE =
  "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]"

/** Texto de diferencia cero (muted) — inventory adjustments */
export const DIFF_ZERO = "text-[var(--ops-text-muted)]"

/** Chip de intencion — apertura (accent violet) — inventory adjustments */
export const CHIP_INTENT_OPENING =
  "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"

/** Chip de intencion — ajuste (neutral) — inventory adjustments */
export const CHIP_INTENT_ADJUSTMENT =
  "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"

/** Panel de etapa para flujos workspace (POS, ajustes, transferencias).
 *  Contrato visual unificado: borde, fondo surface, padding, sombra y transicion.
 *  Usar en secciones con OpsStepSectionHeading como primer hijo. */
export const WORKSPACE_SECTION_CLASS =
  "relative space-y-3 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 shadow-sm transition-all duration-200 sm:p-5"
