"use client";

import * as React from "react";
import Link from "next/link";

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import type { SidebarItem } from "./sidebar-config";
import {
  SIDEBAR_NAV_CONTENT_OFFSET,
  SIDEBAR_NAV_DOT_SIZE,
  SIDEBAR_NAV_GUTTER_WIDTH,
  SIDEBAR_NAV_RAIL_X,
  SIDEBAR_NAV_ROW_HEIGHT,
  SIDEBAR_POPOVER_LINK_CLASS,
} from "./sidebar-styles";
import { resolveActiveItemIndex, isRouteActive } from "./sidebar-utils";

type SidebarNavRailListMode = "inline" | "flyout";

type SidebarNavRailListProps = {
  items: SidebarItem[];
  pathname: string;
  mode: SidebarNavRailListMode;
  onNavigate?: () => void;
};

export function SidebarNavRailList({
  items,
  pathname,
  mode,
  onNavigate,
}: SidebarNavRailListProps) {
  const activeIndex = resolveActiveItemIndex(items, pathname);
  const variablePrefix = mode === "inline" ? "submenu" : "flyout";

  return (
    <div
      className={[
        "relative overflow-visible",
        mode === "inline" ? "group-data-[collapsible=icon]:hidden" : "py-1",
      ].join(" ")}
      style={
        {
          [`--${variablePrefix}-gutter-width`]: SIDEBAR_NAV_GUTTER_WIDTH,
          [`--${variablePrefix}-rail-x`]: SIDEBAR_NAV_RAIL_X,
          [`--${variablePrefix}-dot-size`]: SIDEBAR_NAV_DOT_SIZE,
          [`--${variablePrefix}-row-height`]: SIDEBAR_NAV_ROW_HEIGHT,
          [`--${variablePrefix}-content-offset`]: SIDEBAR_NAV_CONTENT_OFFSET,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute z-[1] w-px",
          mode === "inline"
            ? "bg-sidebar-border/55"
            : "bg-[var(--ops-border-strong)]/70",
          mode === "flyout" && items.length <= 1 ? "hidden" : "",
        ].join(" ")}
        style={{
          left: `calc(var(--${variablePrefix}-rail-x) - 0.5px)`,
          top:
            mode === "inline"
              ? `calc(var(--${variablePrefix}-row-height) / 2)`
              : `calc(var(--${variablePrefix}-row-height) / 2 + 4px)`,
          bottom:
            mode === "inline"
              ? `calc(var(--${variablePrefix}-row-height) / 2)`
              : `calc(var(--${variablePrefix}-row-height) / 2 + 4px)`,
        }}
      />
      <SidebarMenu className="relative z-10 gap-0">
        {items.map((item, index) => (
          <SidebarNavRailLink
            key={item.url}
            href={item.url}
            label={item.title}
            active={
              mode === "inline"
                ? index === activeIndex
                : isRouteActive(pathname, item.url)
            }
            mode={mode}
            variablePrefix={variablePrefix}
            onNavigate={onNavigate}
          />
        ))}
      </SidebarMenu>
    </div>
  );
}

function SidebarNavRailLink({
  href,
  label,
  active,
  mode,
  variablePrefix,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  mode: SidebarNavRailListMode;
  variablePrefix: "submenu" | "flyout";
  onNavigate?: () => void;
}) {
  const isFlyout = mode === "flyout";

  return (
    <SidebarMenuItem>
      <Link
        href={href}
        onClick={onNavigate}
        className={[
          isFlyout
            ? SIDEBAR_POPOVER_LINK_CLASS
            : "group relative flex min-h-9 items-stretch text-sm",
          isFlyout
            ? active
              ? "font-semibold text-[var(--ripnel-accent-hover)]"
              : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)] focus-visible:text-[var(--ops-text)]"
            : "",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150",
            active
              ? isFlyout
                ? "bg-[var(--ripnel-accent)]"
                : "bg-sidebar-primary"
              : isFlyout
                ? "bg-[var(--ops-text-muted)]/55 group-hover/flyout:bg-[var(--ops-text-muted)]/75 group-focus-visible/flyout:bg-[var(--ops-text-muted)]/75"
                : "bg-sidebar-foreground/35",
          ].join(" ")}
          style={{
            left: `var(--${variablePrefix}-rail-x)`,
            width: `var(--${variablePrefix}-dot-size)`,
            height: `var(--${variablePrefix}-dot-size)`,
          }}
        />
        <span
          aria-hidden="true"
          className="shrink-0"
          style={{
            width: `var(--${variablePrefix}-gutter-width)`,
          }}
        />
        <span
          className={[
            "relative flex min-h-9 flex-1 items-center rounded-none",
            isFlyout ? "transition-colors duration-150" : "transition-all duration-150",
            active
              ? isFlyout
                ? "text-[var(--ripnel-accent-hover)]"
                : "font-semibold text-sidebar-primary"
              : isFlyout
                ? "group-hover/flyout:text-[var(--ops-text)] group-focus-visible/flyout:text-[var(--ops-text)]"
                : "text-sidebar-foreground/74 group-hover:text-sidebar-foreground/85",
          ].join(" ")}
          style={{
            paddingLeft: `var(--${variablePrefix}-content-offset)`,
            paddingRight: "12px",
          }}
        >
          <span
            className={[
              "relative inline-flex min-w-0 items-center",
              active ? "pb-1" : "",
            ].join(" ")}
          >
            {active ? (
              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] rounded-full",
                  isFlyout
                    ? "bg-[linear-gradient(to_right,var(--ripnel-accent)_0%,color-mix(in_srgb,var(--ripnel-accent)_42%,transparent)_68%,transparent_100%)]"
                    : "bg-[linear-gradient(to_right,rgba(176,122,228,0.95)_0%,rgba(176,122,228,0.42)_68%,rgba(176,122,228,0.08)_100%)]",
                ].join(" ")}
              />
            ) : null}
            <span className="relative z-[1] truncate">{label}</span>
          </span>
        </span>
      </Link>
    </SidebarMenuItem>
  );
}
