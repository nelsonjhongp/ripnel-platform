"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
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
import { HomeEmptyState } from "@/components/home/home-empty-state";
import { HomeHeader, type HomeHeaderAction } from "@/components/home/home-hero";
import { HomeKpiCard } from "@/components/home/home-kpi-card";
import { HomePendingItem } from "@/components/home/home-pending-item";
import { HomeCriticalStockTable } from "@/components/home/home-critical-stock-table";
import { OpsActionTile } from "@/components/ui/ops-action-tile";
import { OpsMetricStripItem } from "@/components/ui/ops-metric-strip-item";
import { OpsSummaryBand } from "@/components/ui/ops-summary-band";
import type { HomeOverview } from "@/components/home/home-types";
import { apiFetch, ApiError } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

function explainHomeError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No pudimos preparar tu inicio operativo.";
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para preparar tu inicio.";
  }

  if (error.status === 401) {
    return "Tu sesión ya no es válida. Vuelve a iniciar sesión.";
  }

  return error.message || "No pudimos preparar tu inicio operativo.";
}

function formatCurrency(value: number | null | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildHeaderMetadata(
  locationName: string,
  roleName: string | null,
  businessDate: string,
) {
  return [locationName, roleName || null, formatDate(businessDate)].filter(
    (value): value is string => Boolean(value),
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const priorityToneMap: Record<string, "critical" | "warning" | "info"> = {
  "cash-open": "critical",
  "cash-difference": "critical",
  "request-replenishment": "warning",
  "transfer-receive": "warning",
  "transfer-ship": "warning",
  "transfer-approve": "info",
  "low-stock": "info",
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
  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<HomeOverview>("/api/home/overview", {
          cache: "no-store",
        });

        if (active) {
          setOverview(data);
        }
      } catch (loadError) {
        if (!active) return;
        setOverview(null);
        setError(explainHomeError(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

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
    <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-[1180px] space-y-6">
        <HomeHeader
          eyebrow="Inicio"
          title="Inicio operativo"
          metadata={headerMetadata}
          actions={headerActions}
        />

        {overview.priorities.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent)]" />
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                Pendientes de hoy
              </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]">
              {overview.priorities.map((item) => (
                <div
                  key={item.key}
                  className="border-b border-[var(--ops-border-soft)] last:border-b-0"
                >
                  <HomePendingItem
                    icon={
                      priorityIconMap[item.key] ?? (
                        <CircleAlert className="h-4 w-4" />
                      )
                    }
                    title={item.title}
                    description={item.description}
                    cta={priorityCtaMap[item.key] ?? "Resolver"}
                    href={item.href}
                    tone={
                      priorityToneMap[item.key] ??
                      (item.tone === "warning" ? "warning" : "info")
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {personalSales?.visible && (
            <HomeKpiCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Ventas hoy"
              value={personalSales.today.sale_count}
              detail={formatCurrency(personalSales.today.total_amount)}
              tone="accent"
              href={appRoutes.transactionHistory}
            />
          )}

          {cashSection?.visible && (
            <HomeKpiCard
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
            <HomeKpiCard
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
            <HomeKpiCard
              icon={<ArrowLeftRight className="h-4 w-4" />}
              label="Transferencias"
              value={`${transferSection.counts.open_for_store_count + transferSection.counts.pending_receive_count} pendientes`}
              detail={
                transferSection.counts.open_for_store_count === 0 &&
                transferSection.counts.pending_receive_count === 0
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

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <div className="grid gap-6 xl:grid-cols-2">
            {personalSales?.visible ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      Mi actividad comercial
                    </h2>
                  </div>
                  <Link
                    href={appRoutes.transactionHistory}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ver ventas
                  </Link>
                </div>

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <OpsMetricStripItem
                      label="Ventas hoy"
                      value={personalSales.today.sale_count}
                      tone="accent"
                      isNeutral={personalSales.today.sale_count === 0}
                    />
                    <OpsMetricStripItem
                      label="Semana"
                      value={personalSales.week.sale_count}
                      tone="info"
                      isNeutral={personalSales.week.sale_count === 0}
                    />
                    <OpsMetricStripItem
                      label="Facturado hoy"
                      value={formatCurrency(personalSales.today.total_amount)}
                      tone="accent"
                      isNeutral={personalSales.today.total_amount === 0}
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
                      <HomeEmptyState
                        title="Sin ventas personales todavía"
                        description="Cuando confirmes una venta en tu sede activa, aparecerá aquí como referencia rápida."
                      />
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {cashSection?.visible ? (
              <section className="space-y-3">
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
                    <OpsMetricStripItem
                      label="Ventas"
                      value={formatCurrency(cashConsistency?.sales_total)}
                      tone="accent"
                      isNeutral={!cashConsistency}
                    />
                    <OpsMetricStripItem
                      label="Pagos"
                      value={formatCurrency(cashConsistency?.payment_total)}
                      tone="info"
                      isNeutral={!cashConsistency}
                    />
                    <OpsMetricStripItem
                      label="Diferencia"
                      value={formatCurrency(cashConsistency?.difference)}
                      tone={
                        cashConsistency?.is_consistent ? "accent" : "warning"
                      }
                      isNeutral={!cashConsistency}
                    />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {transferSection?.visible || inventorySection?.visible ? (
          <div className="grid gap-6 xl:grid-cols-2">
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

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))] p-4">
                  <div className="grid items-stretch gap-2 sm:grid-cols-3">
                    <OpsMetricStripItem
                      label="Abiertas por mi tienda"
                      value={transferSection.counts.open_for_store_count}
                      tone="accent"
                      isNeutral={
                        transferSection.counts.open_for_store_count === 0
                      }
                    />
                    <OpsMetricStripItem
                      label="Por despachar"
                      value={transferSection.counts.pending_ship_count}
                      tone="warning"
                      isNeutral={
                        transferSection.counts.pending_ship_count === 0
                      }
                    />
                    <OpsMetricStripItem
                      label="Por recibir"
                      value={transferSection.counts.pending_receive_count}
                      tone="info"
                      isNeutral={
                        transferSection.counts.pending_receive_count === 0
                      }
                    />
                  </div>

                  {transferSection.counts.open_for_store_count === 0 &&
                    transferSection.counts.pending_ship_count === 0 &&
                    transferSection.counts.pending_receive_count === 0 && (
                      <div className="mt-3 rounded-xl border border-dashed border-[var(--ops-border-soft)] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Inbox className="h-5 w-5 text-[var(--ops-text-muted)]" />
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            Sin movimientos entre tiendas
                          </p>
                        </div>
                        <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
                          Todavía no hay solicitudes activas ni recepciones
                          pendientes visibles para tu sede.
                        </p>
                      </div>
                    )}
                </div>
              </section>
            )}

            {inventorySection?.visible && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      Stock sensible
                    </h2>
                  </div>
                  <Link
                    href={`${appRoutes.inventory}?status=con-alertas`}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    Ver stock actual
                  </Link>
                </div>

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]">
                  <HomeCriticalStockTable
                    items={inventorySection.critical_variants}
                    lowStockThreshold={inventorySection.low_stock_threshold}
                  />
                </div>
              </section>
            )}

            {!transferSection?.visible && inventorySection?.visible && <div />}
          </div>
        ) : null}

        {adminSection?.visible && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--ripnel-accent)]" />
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Vision gerencial
                </h2>
              </div>
              <Link
                href={appRoutes.dashboard}
                className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
              >
                Ir al panel
              </Link>
            </div>

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
          </section>
        )}

        {!hasAnyContent && (
          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-6">
            <HomeEmptyState
              title="Sin indicadores visibles para tu sesión"
              description="El inicio mostrará módulos operativos cuando tu usuario tenga sede activa y capacidades asociadas."
            />
          </div>
        )}
      </div>
    </section>
  );
}

function buildTransferListRoute() {
  return `${appRoutes.transfers}/listado-de-transferencias`;
}
