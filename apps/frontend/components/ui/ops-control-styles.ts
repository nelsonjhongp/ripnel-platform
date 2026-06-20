export const opsControlClassName =
  "w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] hover:bg-[var(--ops-surface-muted)] focus-visible:border-[var(--ripnel-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"

export const opsSelectTriggerClassName =
  `flex h-9 cursor-pointer items-center justify-between px-3.5 text-left ${opsControlClassName}`

export const opsDropdownContentClassName =
  "max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 ring-0"

export const opsSelectContentClassName =
  "z-[60] max-h-64 w-[var(--radix-select-trigger-width)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 ring-0 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

export const opsSelectOptionClassName =
  "cursor-pointer gap-2 rounded-lg pl-2 pr-7 py-2 focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)] data-[state=checked]:bg-[var(--ripnel-accent-soft)] data-[state=checked]:text-[var(--ripnel-accent-hover)]"

export const opsFieldLabelClassName =
  "block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
