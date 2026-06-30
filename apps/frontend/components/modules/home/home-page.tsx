"use client";

import { useMemo } from "react";
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
import { HomeHeader, type HomeHeaderAction } from "@/components/home/home-hero";
import { HomeCriticalStockTable } from "@/components/home/home-critical-stock-table";
import { HomeTransferRequests } from "@/components/home/home-transfer-requests";
import { OpsActionTile } from "@/components/ui/ops-action-tile";
import { OpsAttentionRow } from "@/components/ui/ops-attention-row";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
import { OpsMetricCard } from "@/components/ui/ops-metric-card";
import type { HomeOverview } from "@/components/home/home-types";
import { useApiGet } from "@/hooks/use-api-get";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-utils";
import { appRoutes } from "@/lib/routes";
import { HOME } from "./home-messages";
import {
  SURFACE_MUTED_30,
  SURFACE_MUTED_52,
  CASH_CONSISTENT_BADGE,
  CASH_INCONSISTENT_BADGE,
  CASH_NO_SUMMARY_BADGE,
} from "./home-constants";

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
  if (status === "open") return HOME.cash.open;
  if (status === "closed") return HOME.cash.closed;
  return HOME.cash.noOpening;
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
  "cash-open": HOME.priorities.cta.cashOpen,
  "request-replenishment": HOME.priorities.cta.replenishment,
  "low-stock": HOME.priorities.cta.lowStock,
  "transfer-receive": HOME.priorities.cta.transferReceive,
  "transfer-approve": HOME.priorities.cta.transferApprove,
  "transfer-ship": HOME.priorities.cta.transferShip,
  "cash-difference": HOME.priorities.cta.cashDiff,
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
        label: HOME.sales.quickSale,
        href: appRoutes.purchaseSystem,
        icon: <ShoppingCart className="h-4 w-4" />,
        variant: "accent",
      });
    }

    if (overview.capabilities.admin && has("dashboard.view")) {
      pushAction({
        key: "manager-panel",
        label: HOME.viewPanel,
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
        title={HOME.header.loadingTitle}
        description={HOME.header.loadingDesc}
      />
    );
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title={HOME.header.errorTitle}
        description={error || HOME.header.errorFallback}
      />
    );
  }

  return (
    <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-[1180px] space-y-6">
        <HomeHeader
          eyebrow={HOME.header.eyebrow}
          title={HOME.header.title}
          metadata={headerMetadata}
          actions={headerActions}
        />

        {overview.priorities.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent)]" />
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                {HOME.priorities.title}
              </h2>
            </div>

            <div className={`overflow-hidden rounded-xl border border-[var(--ops-border-strong)] ${SURFACE_MUTED_30}`}>
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
                    ctaLabel={priorityCtaMap[item.key] ?? HOME.priorities.resolve}
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
          </section>
        )}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {personalSales?.visible && (
            <OpsMetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label={HOME.sales.todayLabel}
              value={personalSales.today.sale_count}
              detail={formatCurrency(personalSales.today.total_amount)}
              tone="accent"
              href={appRoutes.transactionHistory}
            />
          )}

          {cashSection?.visible && (
            <OpsMetricCard
              icon={<Wallet className="h-4 w-4" />}
              label={HOME.cash.label}
              value={formatCashState(cashSection.closing?.status)}
              state={!cashSection.closing ? HOME.cash.actionRequired : undefined}
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
              label={HOME.inventory.criticalStock}
              value={`${inventorySection.zero_stock_count} ${HOME.inventory.inZero}`}
              detail={`${inventorySection.low_stock_count} ${HOME.inventory.belowMin}`}
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
              label={HOME.transfer.label}
              value={`${transferSection.counts.open_for_store_count + transferSection.counts.pending_receipts_count} ${HOME.transfer.pending}`}
              detail={
                transferSection.counts.open_for_store_count === 0 &&
                transferSection.counts.pending_receipts_count === 0
                  ? HOME.transfer.noMovements
                  : `${transferSection.counts.open_for_store_count} ${HOME.transfer.open}`
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
                {HOME.quickActions.title}
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
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      {HOME.sales.sectionTitle}
                    </h2>
                  </div>
                  <Link
                    href={appRoutes.transactionHistory}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    {HOME.sales.viewSales}
                  </Link>
                </div>

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <OpsMetricCard
                      icon={<ShoppingCart className="h-4 w-4" />}
                      label={HOME.sales.todayLabel}
                      value={personalSales.today.sale_count}
                      tone="accent"
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<BarChart3 className="h-4 w-4" />}
                      label={HOME.sales.weekLabel}
                      value={personalSales.week.sale_count}
                      tone={personalSales.week.sale_count === 0 ? "neutral" : "info"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<Wallet className="h-4 w-4" />}
                      label={HOME.sales.todayInvoiced}
                      value={formatCurrency(personalSales.today.total_amount)}
                      tone="accent"
                      className="px-3 py-3"
                    />
                  </div>

                  <div className="mt-3">
                    {personalSales.last_sale ? (
                      <div className={`rounded-xl border border-[var(--ops-border-strong)] ${SURFACE_MUTED_52} px-4 py-3`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {HOME.sales.lastSale}
                        </p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {personalSales.last_sale.sale_number ||
                                HOME.sales.noSaleNumber}
                            </p>
                            <p className="mt-1 truncate text-sm text-[var(--ops-text-muted)]">
                              {personalSales.last_sale.customer_name_text ||
                                HOME.sales.genericCustomer}
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
                        title={HOME.sales.noSalesTitle}
                        description={HOME.sales.noSalesDesc}
                      />
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {cashSection?.visible ? (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      {HOME.cash.sectionTitle}
                    </h2>
                  </div>
                  <Link
                    href={appRoutes.cash}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    {HOME.cash.viewCash}
                  </Link>
                </div>

                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {HOME.cash.shiftStatus}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
                        {formatCashState(cashSection.closing?.status)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                        {!cashSection.closing
                          ? HOME.cash.noClosingHint
                          : cashConsistency?.is_consistent === false
                            ? HOME.cash.inconsistentHint
                            : HOME.cash.consistentHint}
                      </p>
                    </div>

                    <span
                      className={
                        !cashConsistency
                          ? CASH_NO_SUMMARY_BADGE
                          : cashConsistency.is_consistent
                            ? CASH_CONSISTENT_BADGE
                            : CASH_INCONSISTENT_BADGE
                      }
                    >
                      {!cashConsistency
                        ? HOME.cash.noSummary
                        : cashConsistency.is_consistent
                          ? HOME.cash.consistent
                          : HOME.cash.reviewDiff}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <OpsMetricCard
                      icon={<ShoppingCart className="h-4 w-4" />}
                      label={HOME.cash.sales}
                      value={formatCurrency(cashConsistency?.sales_total)}
                      tone={cashConsistency ? "accent" : "neutral"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<Wallet className="h-4 w-4" />}
                      label={HOME.cash.payments}
                      value={formatCurrency(cashConsistency?.payment_total)}
                      tone={cashConsistency ? "info" : "neutral"}
                      className="px-3 py-3"
                    />
                    <OpsMetricCard
                      icon={<CircleAlert className="h-4 w-4" />}
                      label={HOME.cash.difference}
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
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      {HOME.admin.sectionTitle}
                    </h2>
                  </div>
                  <Link
                    href={appRoutes.dashboard}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    {HOME.admin.goToPanel}
                  </Link>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <OpsMetricCard
                    icon={<Users className="h-4 w-4" />}
                    label={HOME.admin.activeUsers}
                    value={adminSection.active_user_count}
                    detail={HOME.admin.locationsDetail(adminSection.active_location_count)}
                    tone="accent"
                  />
                  <OpsMetricCard
                    icon={<Store className="h-4 w-4" />}
                    label={HOME.admin.assignedLocations}
                    value={adminSection.active_location_count}
                    detail={HOME.admin.activeDetail}
                    tone="info"
                  />
                  <OpsMetricCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    label={HOME.admin.openRequests}
                    value={adminSection.pending_requests_count}
                    detail={HOME.admin.networkDetail}
                    tone="success"
                  />
                </div>
              </section>
            )}

            {inventorySection?.visible && (
              <section className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="h-4 w-4 text-[var(--ripnel-accent)]" />
                    <h2 className="text-base font-semibold text-[var(--ops-text)]">
                      {HOME.inventory.sensibleStock}
                    </h2>
                  </div>
                  <Link
                    href={`${appRoutes.inventory}?status=con-alertas`}
                    className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
                  >
                    {HOME.inventory.viewStock}
                  </Link>
                </div>

                <div className={`rounded-xl border border-[var(--ops-border-strong)] ${SURFACE_MUTED_30}`}>
                  <HomeCriticalStockTable
                    items={inventorySection.critical_variants}
                    lowStockThreshold={inventorySection.low_stock_threshold}
                  />
                </div>
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
                  {HOME.transfer.sectionTitle}
                </h2>
              </div>
              <Link
                href={buildTransferListRoute()}
                className="text-[13px] font-medium text-[var(--ripnel-accent)] transition hover:underline"
              >
                {HOME.transfer.viewAll}
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
              title={HOME.noContentTitle}
              description={HOME.noContentDesc}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function buildTransferListRoute() {
  return appRoutes.transfers;
}
