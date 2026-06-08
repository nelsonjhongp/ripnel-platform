export function activeBadgeClass(active: boolean) {
  return active
    ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
}

export function activeBadgeLabel(active: boolean) {
  return active ? "Activo" : "Inactivo"
}
