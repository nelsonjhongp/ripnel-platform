"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleUserRound,
  House,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  resolveCashCapabilities,
  resolveTransferCapabilities,
} from "@/lib/capabilities";
import { appRoutes } from "@/lib/routes";
import {
  sidebarSections,
  type SidebarGroup as SidebarGroupConfig,
  type SidebarItem,
} from "./sidebar-config";
import { SidebarCompactFlyout } from "./SidebarCompactFlyout";
import { SidebarNavRailList } from "./SidebarNavRailList";
import {
  SIDEBAR_COMPACT_ACTIVE_MARKER_CLASS,
  SIDEBAR_ICON_ONLY_CLASS,
  SIDEBAR_MENU_BUTTON_CLASS,
  SIDEBAR_MENU_EXPANDED_ACTIVE_CLASS,
} from "./sidebar-styles";
import { isRouteActive, resolveActiveItemIndex } from "./sidebar-utils";

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}) {
  return (
    <SidebarMenuItem>
      {active ? (
        <span aria-hidden="true" className={SIDEBAR_COMPACT_ACTIVE_MARKER_CLASS} />
      ) : null}
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className={[
          SIDEBAR_MENU_BUTTON_CLASS,
          "data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)] group-data-[collapsible=icon]:shadow-none!",
          SIDEBAR_ICON_ONLY_CLASS,
        ].join(" ")}
      >
        <Link href={href}>
          {Icon ? (
            <Icon
              className={[
                "h-4 w-4 transition-colors duration-150",
                active
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/65",
              ].join(" ")}
            />
          ) : (
            <span className="h-4 w-4" />
          )}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}


function SidebarGroupSection({
  title,
  icon: Icon,
  items,
  directLink,
  pathname,
  roleName,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SidebarItem[];
  directLink?: boolean;
  pathname: string;
  roleName?: string | null;
}) {
  const { state, isMobile } = useSidebar();
  const visibleItems = items.filter((item) => {
    if (
      item.onlyForRoles &&
      roleName &&
      !item.onlyForRoles.includes(roleName)
    ) {
      return false;
    }

    if (item.excludeRoles && roleName && item.excludeRoles.includes(roleName)) {
      return false;
    }

    return true;
  });

  if (visibleItems.length === 0) {
    return null;
  }

  if (directLink && visibleItems.length === 1) {
    const item = visibleItems[0];
    const isActive = isRouteActive(pathname, item.url);

    return (
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarLink
              href={item.url}
              label={title}
              icon={Icon}
              active={isActive}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const sectionIsActive = resolveActiveItemIndex(visibleItems, pathname) !== -1;

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarCompactFlyout
        title={title}
        icon={Icon}
        items={visibleItems}
        pathname={pathname}
      />
    );
  }

  return (
    <SidebarGroup className="p-0">
      <Collapsible defaultOpen={sectionIsActive} className="group">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={title}
                  className={[
                    SIDEBAR_MENU_BUTTON_CLASS,
                    sectionIsActive
                      ? SIDEBAR_MENU_EXPANDED_ACTIVE_CLASS
                      : "hover:bg-sidebar-accent/50 group-data-[state=open]:bg-sidebar-accent/90 group-data-[state=open]:text-sidebar-foreground",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4 transition-colors duration-150",
                      sectionIsActive
                        ? "text-sidebar-foreground/80"
                        : "text-sidebar-foreground/65 group-data-[state=open]:text-sidebar-foreground/80",
                    ].join(" ")}
                  />
                  <span>{title}</span>
                  <ChevronDown
                    className={[
                      "ml-auto h-4 w-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180",
                      sectionIsActive
                        ? "text-sidebar-foreground/65"
                        : "text-sidebar-foreground/55 group-data-[state=open]:text-sidebar-foreground/65",
                    ].join(" ")}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
          </SidebarMenu>
          <CollapsibleContent className="pt-0">
            <SidebarNavRailList
              items={visibleItems}
              pathname={pathname}
              mode="inline"
            />
          </CollapsibleContent>
        </SidebarGroupContent>
      </Collapsible>
    </SidebarGroup>
  );
}

function SidebarSectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45 select-none group-data-[collapsible=icon]:hidden">
      {label}
    </p>
  );
}

export function AppSidebar({
  children,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof Sidebar>>) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    permissions,
    loading,
    locationsLoading,
    locationsError,
    defaultLocation,
    has,
    logout,
  } = useAuth();

  const transferCapabilities = React.useMemo(
    () =>
      resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name],
  );
  const cashCapabilities = React.useMemo(
    () => resolveCashCapabilities({ permissions }),
    [permissions],
  );
  const canViewDashboard = has("dashboard.view");

  const visibleSections = React.useMemo(() => {
    if (loading) return [];

    return sidebarSections
      .map((section) => {
        const visibleGroups: SidebarGroupConfig[] = [];

        for (const group of section.groups) {
          const items = group.items.filter((item) => {
            if (item.permission && !has(item.permission)) {
              return false;
            }

            if (item.url.startsWith("/transferencias/")) {
              if (item.url.endsWith("/solicitar")) {
                return transferCapabilities.requestCreate;
              }

              if (item.url.endsWith("/recepciones")) {
                return transferCapabilities.receive;
              }
            }

            if (item.url === "/transferencias") {
              return transferCapabilities.visible;
            }

            if (item.url.startsWith("/caja")) {
              if (item.url.endsWith("/control")) {
                return cashCapabilities.admin;
              }

              return cashCapabilities.visible;
            }

            if (
              item.onlyForRoles &&
              user?.role_name &&
              !item.onlyForRoles.includes(user.role_name)
            ) {
              return false;
            }

            if (
              item.excludeRoles &&
              user?.role_name &&
              item.excludeRoles.includes(user.role_name)
            ) {
              return false;
            }

            return true;
          });

          if (group.permission && !has(group.permission)) continue;

          if (
            group.onlyForRoles &&
            user?.role_name &&
            !group.onlyForRoles.includes(user.role_name)
          ) {
            continue;
          }

          if (
            group.excludeRoles &&
            user?.role_name &&
            group.excludeRoles.includes(user.role_name)
          ) {
            continue;
          }

          if (items.length === 0) continue;

          visibleGroups.push({ ...group, items });
        }

        return visibleGroups.length > 0
          ? { label: section.label, groups: visibleGroups }
          : null;
      })
      .filter((section): section is NonNullable<typeof section> => section !== null);
  }, [loading, has, transferCapabilities, cashCapabilities, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-1 bg-background">
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-sidebar-border bg-sidebar text-sidebar-foreground"
        style={
          {
            "--sidebar": "var(--theme-sidebar-bg)",
            "--sidebar-foreground": "var(--theme-sidebar-fg)",
            "--sidebar-primary": "var(--theme-sidebar-primary)",
            "--sidebar-primary-foreground": "var(--theme-sidebar-primary-fg)",
            "--sidebar-accent": "var(--theme-sidebar-accent)",
            "--sidebar-accent-foreground": "var(--theme-sidebar-accent-fg)",
            "--sidebar-border": "var(--theme-sidebar-border)",
            "--sidebar-ring": "var(--theme-sidebar-ring)",
          } as React.CSSProperties
        }
        {...props}
      >
        <SidebarHeader className="border-b border-sidebar-border px-3 pb-3 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
          <Link
            href={appRoutes.home}
            className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
            aria-label="Inicio Ripnel"
          >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-1 ring-sidebar-border group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                <Image
                  src="/ripnel-logo.svg"
                  alt="Ripnel"
                  width={36}
                  height={33}
                  className="h-8 w-8 object-contain group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
                />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-base font-semibold leading-5 text-sidebar-foreground">
                Creaciones Ripnel
              </p>
              <p className="text-xs text-sidebar-foreground/65">Sistema ERP</p>
            </div>
          </Link>

          <div className="mt-3 rounded-2xl bg-sidebar-accent/70 px-2.5 py-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-sidebar-foreground/65" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">
                    {locationsLoading
                      ? "Cargando sede..."
                      : locationsError
                        ? "Sede no disponible"
                        : defaultLocation?.name || "Sin sede asignada"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(appRoutes.account)}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sidebar-foreground/65 transition hover:bg-background/70 hover:text-sidebar-foreground"
                aria-label="Gestionar sede"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-0 py-3">
          <nav className="space-y-0">
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink
                    href={appRoutes.home}
                    label="Inicio"
                    icon={House}
                    active={pathname === appRoutes.home}
                  />
                  {canViewDashboard ? (
                    <SidebarLink
                      href={appRoutes.dashboard}
                      label="Dashboard"
                      icon={LayoutDashboard}
                      active={pathname === appRoutes.dashboard}
                    />
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {visibleSections.map((section) => (
              <React.Fragment key={section.label}>
                <SidebarSectionLabel label={section.label} />
                {section.groups.map((group) => (
                  <SidebarGroupSection
                    key={group.title}
                    title={group.title}
                    icon={group.icon}
                    items={group.items}
                    directLink={group.directLink}
                    pathname={pathname}
                    roleName={user?.role_name}
                  />
                ))}
              </React.Fragment>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-0 pb-3 pt-2.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Cuenta"
                className="h-11 rounded-none px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg"
              >
                <Link href={appRoutes.account} aria-label="Cuenta">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                    <CircleUserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">
                      {user?.full_name || "Usuario"}
                    </p>
                    <p className="truncate text-xs text-sidebar-foreground/65">
                      {user?.role_name || "Rol"}
                    </p>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Cerrar sesión"
                aria-label="Cerrar sesión"
                onClick={handleLogout}
                className="h-10 gap-2.5 rounded-none px-3 text-sm font-medium text-sidebar-foreground/60 transition-all duration-150 ease-out cursor-pointer hover:bg-red-500/10 hover:text-red-500 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </div>
  );
}

export default AppSidebar;
