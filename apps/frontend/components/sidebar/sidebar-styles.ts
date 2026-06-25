export const SIDEBAR_NAV_GUTTER_WIDTH = "28px";
export const SIDEBAR_NAV_RAIL_X = "18px";
export const SIDEBAR_NAV_DOT_SIZE = "6px";
export const SIDEBAR_NAV_ROW_HEIGHT = "36px";
export const SIDEBAR_NAV_CONTENT_OFFSET = "8px";

export const SIDEBAR_FLYOUT_CLOSE_DELAY_MS = 70;
export const SIDEBAR_FLYOUT_TRIGGER_CLICK_GUARD_MS = 500;

export const SIDEBAR_MENU_BUTTON_CLASS =
  "relative h-10 gap-2.5 rounded-none px-3 text-sm font-medium transition-all duration-150 ease-out cursor-pointer";

export const SIDEBAR_MENU_EXPANDED_ACTIVE_CLASS =
  "bg-sidebar-accent font-semibold text-sidebar-primary shadow-[inset_3px_0_0_var(--sidebar-primary)] group-data-[collapsible=icon]:shadow-none!";

export const SIDEBAR_MENU_COMPACT_ACTIVE_CLASS =
  "bg-sidebar-accent font-semibold text-sidebar-primary shadow-none";

export const SIDEBAR_ICON_ONLY_CLASS =
  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:[&>span]:hidden";

export const SIDEBAR_COMPACT_ACTIVE_MARKER_CLASS =
  "pointer-events-none absolute left-0 top-1/2 z-[3] hidden h-7 w-[3px] -translate-y-1/2 rounded-r-[1px] bg-sidebar-primary group-data-[collapsible=icon]:block";

export const SIDEBAR_POPOVER_CONTENT_CLASS =
  "w-64 overflow-hidden rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface)_96%,var(--ops-surface-muted))] p-0 text-[var(--ops-text)] shadow-[0_10px_22px_rgb(15_23_42_/_0.07)] data-[state=open]:duration-75 data-[state=closed]:duration-75 data-[state=open]:[--tw-enter-scale:1] data-[state=closed]:[--tw-exit-scale:1]";

export const SIDEBAR_POPOVER_LINK_CLASS =
  "group/flyout relative flex min-h-9 items-stretch text-sm transition-colors duration-150 hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_62%,transparent)] focus-visible:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)]";
