"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Info,
  Inbox,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Store,
  TriangleAlert,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorPage, LoadingPage } from "@/components/feedback/status-page";
import { HomeHeader, type HomeHeaderAction } from "@/components/home/home-hero";
import { HomeCriticalStockTable } from "@/components/home/home-critical-stock-table";
import { HomeTransferRequests } from "@/components/home/home-transfer-requests";
import { OpsActionTile } from "@/components/ui/ops-action-tile";
import { OpsAttentionRow } from "@/components/ui/ops-attention-row";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
import { OpsMetricCard } from "@/components/ui/ops-metric-card";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { OpsMetricStripItem } from "@/components/ui/ops-metric-strip-item";
import { OpsPendingRow } from "@/components/ui/ops-pending-row";
import { OpsSummaryBand } from "@/components/ui/ops-summary-band";
import type { HomeOverview } from "@/components/home/home-types";
import { useApiGet } from "@/hooks/use-api-get";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-utils";
import { appRoutes } from "@/lib/routes";

function buildHeaderMetadata(
  locationName: string,
  roleName: string | null,
  businessDate: string,
) {
  const dateLabel = businessDate ? formatDate(businessDate) : null;
  return [locationName, roleName || null, dateLabel].filter(
    (value): value is string => Boolean(value),
  );
}

function resolveHeaderActionIcon(href: string) {
  if (href === appRoutes.cash) {
    return <Wallet className="h-4 w-4" />;
  }

  if (href === appRoutes.dashboard) {
    return <ShieldCheck className="h-4 w-4" />;
  }

  if (href.startsWith(appRoutes.transfers)) {
    return <ArrowLeftRight className="h-4 w-4" />;
  }

  return <ShoppingCart className="h-4 w-4" />;
}

function formatCashState(status: "open" | "closed" | null | undefined) {
  if (status === "open") return "Caja abierta";
  if (status === "closed") return "Caja cerrada";
  return "Sin apertura";
}

const priorityIconMap: Record<string, React.ReactNode> = {
  "cash-open": <CircleAlert className="h-4 w-4" />,
  "request-replenishment": <TriangleAlert className="h-4 w-4" />,
  "low-stock": <Info className="h-4 w-4" />,
  "transfer-receive": <PackageSearch className="h-4 w-4" />,
  "transfer-approve": <ClipboardList className="h-4 w-4" />,
  "transfer-ship": <Truck className="h-4 w-4" />,
  "cash-difference": <CircleAlert className="h-4 w-4" />,
};

const priorityToneMap: Record<string, "danger" | "warning" | "accent"> = {
  "cash-open": "danger",
  "cash-difference": "danger",
  "request-replenishment": "warning",
  "transfer-receive": "warning",
  "transfer-ship": "warning",
  "transfer-approve": "accent",
  "low-stock": "accent",
};

const priorityCtaMap: Record<string, string> = {
  "cash-open": "Abrir caja",
  "request-replenishment": "Crear solicitud",
  "low-stock": "Ver stock",
  "transfer-receive": "Recepcionar",
  "transfer-approve": "Aprobar",
  "transfer-ship": "Despachar",
  "cash-difference": "Revisar caja",
};

const quickActionIconMap: Record<string, React.ReactNode> = {
  "new-sale": <ShoppingCart className="h-4 w-4" />,
  "sales-history": <ShoppingCart className="h-4 w-4" />,
  "request-products": <PackageSearch className="h-4 w-4" />,
  "transfer-tracking": <ArrowLeftRight className="h-4 w-4" />,
  receipts: <Inbox className="h-4 w-4" />,
  cash: <Wallet className="h-4 w-4" />,
  inventory: <PackageSearch className="h-4 w-4" />,
  bi: <BarChart3 className="h-4 w-4" />,
};

const quickActionToneMap: Record<
  string,
  "accent" | "warning" | "success" | "info" | "neutral"
> = {
  "new-sale": "accent",
  "sales-history": "accent",
  "request-products": "warning",
  "transfer-tracking": "success",
  receipts: "info",
  cash: "success",
  inventory: "neutral",
  bi: "info",
};

export default function InicioPage() {
  const { loading: authLoading, has } = useAuth();

  const { data: overview, loading, error } = useApiGet(
    () => apiFetch<HomeOverview>("/api/home/overview", {
      cache: "no-store",
    }),
    []
  )

  const headerMetadata = useMemo(() => {
    if (!overview) return [];

    return buildHeaderMetadata(
      overview.context.location.name,
      overview.context.user.role_name,
      overview.context.business_date,
    );
  }, [overview]);

  const headerActions = useMemo<HomeHeaderAction[]>(() => {
    if (!overview) return [];

    const actions: HomeHeaderAction[] = [];
    const usedHrefs = new Set<string>();

    const pushAction = (action: HomeHeaderAction) => {
      if (usedHrefs.has(action.href)) return;
      usedHrefs.add(action.href);
      actions.push(action);
    };

    if (overview.hero.cta) {
      pushAction({
        key: `hero-${overview.hero.cta.href}`,
        label: overview.hero.cta.label,
        href: overview.hero.cta.href,
        icon: resolveHeaderActionIcon(overview.hero.cta.href),
        variant: overview.hero.tone === "warning" ? "outline" : "accent",
      });
    } else if (overview.capabilities.sales) {
      pushAction({
        key: "quick-sale",
        label: "Venta rápida",
        href: appRoutes.purchaseSystem,
        icon: <ShoppingCart className="h-4 w-4" />,
        variant: "accent",
      });
    }

    if (overview.capabilities.admin && has("dashboard.view")) {
      pushAction({
        key: "manager-panel",
        label: "Ver panel",
        href: appRoutes.dashboard,
        icon: <ShieldCheck className="h-4 w-4" />,
        variant: "outline",
      });
    }

    return actions.slice(0, 2);
  }, [overview, has]);

  const quickActions = useMemo(() => {
    if (!overview) return [];

    const headerActionHrefs = new Set(headerActions.map((item) => item.href));
    return overview.quick_actions.filter(
      (item) => !headerActionHrefs.has(item.href),
    );
  }, [headerActions, overview]);

  const personalSales = overview?.sections.personal_sales ?? null;
  const cashSection = overview?.sections.cash ?? null;
  const inventorySection = overview?.sections.inventory ?? null;
  const transferSection = overview?.sections.transfer_requests ?? null;
  const adminSection = overview?.sections.admin ?? null;
  const cashConsistency = cashSection?.consistency ?? null;

  const hasAnyContent =
    personalSales?.visible ||
    cashSection?.visible ||
    inventorySection?.visible ||
    transferSection?.visible ||
    adminSection?.visible;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ripnel-home-collapsed");
      if (raw) setCollapsed(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("ripnel-home-collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const sectionChevron = (key: string) => (
    <ChevronDown
      className={`ml-auto h-4 w-4 text-[var(--ops-text-muted)] shrink-0 transition-transform ${
        collapsed[key] ? "-rotate-90" : ""
      }`}
    />
  );

  if ((loading || authLoading) && !overview) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando tu inicio"
        description="Estamos reuniendo ventas, caja, solicitudes entre tiendas e indicadores de tu sede activa."
      />
    );
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir tu inicio"
        description={
          error || "El inicio personalizado no está disponible en este momento."
        }
      />
    );
  }

  return (
    <OpsPageShell width="wide">
        <HomeHeader
          eyebrow="Inicio"
          title="Inicio operativo"
          metadata={headerMetadata}
          actions={headerActions}
        />

        {overview.priorities.length > 0 && (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => toggleSection("priorities")}
              className="flex w-full items-center gap-2 text-left"
            >
              <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent)]" />
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                Pendientes de hoy
              </h2>
              {sectionChevron("priorities")}
            </button>

            {!collapsed.priorities ? (
            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]">
              {overview.priorities.map((item) => (
                <div
                  key={item.key}
                  className="border-b border-[var(--ops-border-soft)] last:border-b-0"
                >
                  <OpsAttentionRow
                    icon={
                      priorityIconMap[item.key] ?? (
                        <CircleAlert className="h-4 w-4" />
                      )
                    }
                    title={item.title}
                    description={item.description}
                    ctaLabel={priorityCtaMap[item.key] ?? "Resolver"}
                    href={item.href}
                    tone={
                      priorityToneMap[item.key] ??
                      (item.tone === "warning" ? "warning" : "accent")
                    }
                    embedded
                  />
                </div>
              ))}
            </div>
            ) : null}
          </section>
        )}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {personalSales?.visible && (
            <OpsMetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Ventas hoy"
              value={personalSales.today.sale_count}
              detail={formatCurrency(personalSales.today.total_amount)}
              tone="accent"
              href={appRoutes.transactionHistory}
            />
          )}

          {cashSection?.visible && (
            <OpsMetricCard
              icon={<Wallet className="h-4 w-4" />}
              label="Caja"
              value={formatCashState(cashSection.closing?.status)}
              state={!cashSection.closing ? "Accion requerida" : undefined}
              tone={
                !cashSection.closing
                  ? "warning"
                  : cashConsistency?.is_consistent === false
                    ? "danger"
                    : "success"
              }
              href={appRoutes.cash}
            />
          )}

          {inventorySection?.visible && (
            <OpsMetricCard
              icon={<TriangleAlert className="h-4 w-4" />}
              label="Stock critico"
              value={`${inventorySection.zero_stock_count} en cero`}
              detail={`${inventorySection.low_stock_count} bajo minimo`}
              tone="danger"
              href={
                inventorySection.zero_stock_count > 0
                  ? `${appRoutes.inventory}?status=sin-stock`
                  : inventorySection.low_stock_count > 0
                    ? `${appRoutes.inventory}?status=stock-bajo`
                    : appRoutes.inventory
              }
            />
          )}

          {transferSection?.visible && (
            <OpsMetricCard
              icon={<ArrowLeftRight className="h-4 w-4" />}
              label="Transferencias"
              value={`${transferSection.counts.open_for_store_count + transferSection.counts.pending_receipts_count} pendientes`}
              detail={
                transferSection.counts.open_for_store_count === 0 &&
                transferSection.counts.pending_receipts_count === 0
                  ? "Sin movimientos"
                  : `${transferSection.counts.open_for_store_count} abiertas`
              }
              tone="neutral"
              href={buildTransferListRoute()}
            />
          )}
        </div>

        {quickActions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                Acciones rápidas
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickActions.map((item) => (
                <OpsActionTile
                  key={item.key}
                  href={item.href}
                  label={item.label}
                  icon={
                    quickActionIconMap[item.key] ?? (
                      <ShoppingCart className="h-4 w-4" />
                    )
                  }
                  tone={quickActionToneMap[item.key] ?? "neutral"}
                />
              ))}
            </div>
          </section>
        )}

        {personalSales?.visible || cashSection?.visible ? (
          <div className="flex flex-col gap-6 xl:flex-row">
            {personalSales?.visible ? (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection("personal")}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ShoppingCart className="h-4 w-4 text-[var(--ripnel-accent)]" />
                      <h2 className="text-base font-semibold text-[var(--ops-text)]">
                        Mi actividad comercial
                      </h2>
                      {sectionChevron("personal")}
                    </button>
                  </div>
                  <Link
                    href={appRoutes.transactionHistory}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ver ventas
                  </Link>
                </div>

                {!collapsed.personal ? (
                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <OpsMetricCard
                      icon={<ShoppingCart className="h-4 w-4" />}
                      label="Ventas hoy"
                      value={personalSales.today.sale_count}
                      tone="accent"
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<BarChart3 className="h-4 w-4" />}
                      label="Semana"
                      value={personalSales.week.sale_count}
                      tone={personalSales.week.sale_count === 0 ? "neutral" : "info"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<Wallet className="h-4 w-4" />}
                      label="Facturado hoy"
                      value={formatCurrency(personalSales.today.total_amount)}
                      tone="accent"
                      className="px-3 py-3"
                    />
                  </div>

                  <div className="mt-3">
                    {personalSales.last_sale ? (
                      <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_52%,var(--ops-surface))] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          Ultima venta confirmada
                        </p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {personalSales.last_sale.sale_number ||
                                "Venta registrada"}
                            </p>
                            <p className="mt-1 truncate text-sm text-[var(--ops-text-muted)]">
                              {personalSales.last_sale.customer_name_text ||
                                "Cliente general"}
                            </p>
                            <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
                              {formatDateTime(
                                personalSales.last_sale.confirmed_at,
                              )}
                            </p>
                          </div>
                          <p className="text-base font-semibold text-[var(--ops-text)]">
                            {formatCurrency(
                              personalSales.last_sale.total_amount,
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <OpsEmptyState
                        variant="compact"
                        title="Sin ventas personales todavía"
                        description="Cuando confirmes una venta en tu sede activa, aparecerá aquí como referencia rápida."
                      />
                    )}
                  </div>
                </div>
                ) : null}
              </section>
            ) : null}

            {cashSection?.visible ? (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      Caja de mi sede
                    </h2>
                  </div>
                  <Link
                    href={appRoutes.cash}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ver caja
                  </Link>
                </div>

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Estado de jornada
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
                        {formatCashState(cashSection.closing?.status)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                        {!cashSection.closing
                          ? "Conviene aperturar antes de apoyarte en los totales del dia."
                          : cashConsistency?.is_consistent === false
                            ? "Hay una diferencia entre ventas y pagos registrados."
                            : "La sede ya tiene una sesion de caja activa o cerrada para hoy."}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        !cashConsistency
                          ? "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                          : cashConsistency.is_consistent
                            ? "border-emerald-300/70 bg-[color:color-mix(in_srgb,#22c55e_12%,var(--ops-surface))] text-emerald-700"
                            : "border-amber-300/70 bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-amber-700"
                      }`}
                    >
                      {!cashConsistency
                        ? "Sin resumen"
                        : cashConsistency.is_consistent
                          ? "Caja cuadra"
                          : "Revisar diferencia"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <OpsMetricCard
                      icon={<ShoppingCart className="h-4 w-4" />}
                      label="Ventas"
                      value={formatCurrency(cashConsistency?.sales_total)}
                      tone={cashConsistency ? "accent" : "neutral"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<Wallet className="h-4 w-4" />}
                      label="Pagos"
                      value={formatCurrency(cashConsistency?.payment_total)}
                      tone={cashConsistency ? "info" : "neutral"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<CircleAlert className="h-4 w-4" />}
                      label="Diferencia"
                      value={formatCurrency(cashConsistency?.difference)}
                      tone={
                        !cashConsistency
                          ? "neutral"
                          : cashConsistency.is_consistent
                            ? "accent"
                            : "warning"
                      }
                      className="px-3 py-3"
                    />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {(adminSection?.visible || inventorySection?.visible) && (
          <div className="flex flex-col gap-6 xl:flex-row">
            {adminSection?.visible && (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection("admin")}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ShieldCheck className="h-4 w-4 text-[var(--ripnel-accent)]" />
                      <h2 className="text-base font-semibold text-[var(--ops-text)]">
                        Vision gerencial
                      </h2>
                      {sectionChevron("admin")}
                    </button>
                  </div>
                  <Link
                    href={appRoutes.dashboard}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ir al panel
                  </Link>
                </div>

                {!collapsed.admin ? (
                <OpsSummaryBand
                  items={[
                    {
                      icon: <Users className="h-4 w-4" />,
                      label: "Usuarios activos",
                      value: adminSection.active_user_count,
                      meta: `${adminSection.active_location_count} sede(s)`,
                      tone: "accent",
                    },
                    {
                      icon: <Store className="h-4 w-4" />,
                      label: "Sedes asignadas",
                      value: adminSection.active_location_count,
                      meta: "Activas",
                      tone: "info",
                    },
                    {
                      icon: <ClipboardList className="h-4 w-4" />,
                      label: "Solicitudes abiertas",
                      value: adminSection.pending_requests_count,
                      meta: "Red asignada",
                      tone: "success",
                    },
                  ]}
                />
                ) : null}
              </section>
            )}

            {inventorySection?.visible && (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection("inventory")}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <PackageSearch className="h-4 w-4 text-[var(--ripnel-accent)]" />
                      <h2 className="text-base font-semibold text-[var(--ops-text)]">
                        Stock sensible
                      </h2>
                      {sectionChevron("inventory")}
                    </button>
                  </div>
                  <Link
                    href={`${appRoutes.inventory}?status=con-alertas`}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ver stock actual
                  </Link>
                </div>

                {!collapsed.inventory ? (
                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]">
                  <HomeCriticalStockTable
                    items={inventorySection.critical_variants}
                    lowStockThreshold={inventorySection.low_stock_threshold}
                  />
                </div>
                ) : null}
              </section>
            )}
          </div>
        )}

        {transferSection?.visible && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-[var(--ripnel-accent)]" />
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Transferencias entre tiendas
                </h2>
              </div>
              <Link
                href={buildTransferListRoute()}
                className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
              >
                Ver todas
              </Link>
            </div>

            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
              <HomeTransferRequests
                section={transferSection}
                formatDateTime={formatDateTime}
              />
            </div>
          </section>
        )}

        {!hasAnyContent && (
          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-6">
            <OpsEmptyState
              variant="compact"
              title="Sin indicadores visibles para tu sesión"
              description="El inicio mostrará módulos operativos cuando tu usuario tenga sede activa y capacidades asociadas."
            />
          </div>
        )}
    </OpsPageShell>
  );
}

function buildTransferListRoute() {
  return appRoutes.transfers;
}
