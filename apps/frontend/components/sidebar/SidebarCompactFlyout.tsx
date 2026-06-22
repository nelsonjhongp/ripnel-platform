"use client";

import * as React from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { SidebarItem } from "./sidebar-config";
import { SidebarNavRailList } from "./SidebarNavRailList";
import {
  SIDEBAR_COMPACT_ACTIVE_MARKER_CLASS,
  SIDEBAR_FLYOUT_CLOSE_DELAY_MS,
  SIDEBAR_FLYOUT_TRIGGER_CLICK_GUARD_MS,
  SIDEBAR_ICON_ONLY_CLASS,
  SIDEBAR_MENU_BUTTON_CLASS,
  SIDEBAR_MENU_COMPACT_ACTIVE_CLASS,
  SIDEBAR_POPOVER_CONTENT_CLASS,
} from "./sidebar-styles";
import { resolveActiveItemIndex } from "./sidebar-utils";

type SidebarCompactFlyoutProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarItem[];
  pathname: string;
};

export function SidebarCompactFlyout({
  title,
  icon: Icon,
  items,
  pathname,
}: SidebarCompactFlyoutProps) {
  const sectionIsActive = resolveActiveItemIndex(items, pathname) !== -1;
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(false);
  const triggerRef = React.useRef<HTMLLIElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const clickGuardTimerRef = React.useRef<number | null>(null);
  const ignoreNextTriggerClickRef = React.useRef(false);
  const pointerInsideTriggerRef = React.useRef(false);
  const pointerInsideContentRef = React.useRef(false);

  const clearCloseTimer = React.useCallback(() => {
    if (!closeTimerRef.current) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const clearClickGuardTimer = React.useCallback(() => {
    if (!clickGuardTimerRef.current) return;
    window.clearTimeout(clickGuardTimerRef.current);
    clickGuardTimerRef.current = null;
  }, []);

  const guardNextTriggerClick = React.useCallback(() => {
    ignoreNextTriggerClickRef.current = true;
    clearClickGuardTimer();
    clickGuardTimerRef.current = window.setTimeout(() => {
      ignoreNextTriggerClickRef.current = false;
      clickGuardTimerRef.current = null;
    }, SIDEBAR_FLYOUT_TRIGGER_CLICK_GUARD_MS);
  }, [clearClickGuardTimer]);

  const setFlyoutOpen = React.useCallback((nextOpen: boolean) => {
    openRef.current = nextOpen;
    setOpen(nextOpen);
  }, []);

  const closeNow = React.useCallback(() => {
    clearCloseTimer();
    ignoreNextTriggerClickRef.current = false;
    setFlyoutOpen(false);
  }, [clearCloseTimer, setFlyoutOpen]);

  const hasFocusWithinFlyout = React.useCallback(() => {
    const activeElement = document.activeElement;

    return Boolean(
      activeElement &&
        (triggerRef.current?.contains(activeElement) ||
          contentRef.current?.contains(activeElement)),
    );
  }, []);

  const shouldRemainOpen = React.useCallback(() => {
    return (
      pointerInsideTriggerRef.current ||
      pointerInsideContentRef.current ||
      hasFocusWithinFlyout()
    );
  }, [hasFocusWithinFlyout]);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      if (!shouldRemainOpen()) {
        setFlyoutOpen(false);
      }
    }, SIDEBAR_FLYOUT_CLOSE_DELAY_MS);
  }, [clearCloseTimer, setFlyoutOpen, shouldRemainOpen]);

  const openNow = React.useCallback(() => {
    clearCloseTimer();
    setFlyoutOpen(true);
  }, [clearCloseTimer, setFlyoutOpen]);

  const handleTriggerPointerEnter = React.useCallback(() => {
    pointerInsideTriggerRef.current = true;
    if (!openRef.current) {
      guardNextTriggerClick();
    }
    openNow();
  }, [guardNextTriggerClick, openNow]);

  const handleTriggerPointerLeave = React.useCallback(() => {
    pointerInsideTriggerRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleContentPointerEnter = React.useCallback(() => {
    pointerInsideContentRef.current = true;
    openNow();
  }, [openNow]);

  const handleContentPointerLeave = React.useCallback(() => {
    pointerInsideContentRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const toggleFromTrigger = React.useCallback(() => {
    clearCloseTimer();

    if (ignoreNextTriggerClickRef.current) {
      ignoreNextTriggerClickRef.current = false;
      clearClickGuardTimer();
      setFlyoutOpen(true);
      return;
    }

    setFlyoutOpen(!openRef.current);
  }, [clearClickGuardTimer, clearCloseTimer, setFlyoutOpen]);

  const handleTriggerPointerDownCapture = React.useCallback(
    (event: React.PointerEvent<HTMLLIElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      toggleFromTrigger();
    },
    [toggleFromTrigger],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNow();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        toggleFromTrigger();
      }
    },
    [closeNow, toggleFromTrigger],
  );

  React.useEffect(() => {
    return () => {
      clearCloseTimer();
      clearClickGuardTimer();
    };
  }, [clearClickGuardTimer, clearCloseTimer]);

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem
            ref={triggerRef}
            onPointerDownCapture={handleTriggerPointerDownCapture}
            onPointerEnter={handleTriggerPointerEnter}
            onPointerLeave={handleTriggerPointerLeave}
            onFocus={openNow}
            onBlur={scheduleClose}
          >
            {sectionIsActive ? (
              <span
                aria-hidden="true"
                className={SIDEBAR_COMPACT_ACTIVE_MARKER_CLASS}
              />
            ) : null}
            <Popover open={open} onOpenChange={setFlyoutOpen}>
              <PopoverAnchor asChild>
                <SidebarMenuButton
                  aria-label={title}
                  aria-expanded={open}
                  onKeyDown={handleKeyDown}
                  className={[
                    SIDEBAR_MENU_BUTTON_CLASS,
                    SIDEBAR_ICON_ONLY_CLASS,
                    sectionIsActive
                      ? SIDEBAR_MENU_COMPACT_ACTIVE_CLASS
                      : "hover:bg-sidebar-accent/50",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4 transition-colors duration-150",
                      sectionIsActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/65",
                    ].join(" ")}
                  />
                  <span>{title}</span>
                </SidebarMenuButton>
              </PopoverAnchor>
              <PopoverContent
                ref={contentRef}
                side="right"
                align="start"
                sideOffset={6}
                className={SIDEBAR_POPOVER_CONTENT_CLASS}
                onPointerEnter={handleContentPointerEnter}
                onPointerLeave={handleContentPointerLeave}
                onFocus={openNow}
                onBlur={scheduleClose}
                onKeyDown={handleKeyDown}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <div className="border-b border-[var(--ops-border-strong)] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    {title}
                  </p>
                </div>
                <SidebarNavRailList
                  items={items}
                  pathname={pathname}
                  mode="flyout"
                  onNavigate={closeNow}
                />
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
