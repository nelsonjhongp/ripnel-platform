"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Grid3X3, MapPin, RefreshCw } from "lucide-react";
import {
  ErrorPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import { OpsPageShell, OpsTableWrap } from "@/components/ui/ops-page-shell";
import { OpsPanelSection } from "@/components/ui/ops-panel-section";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSidebarTopbarBreadcrumbs } from "@/components/sidebar/SidebarShell";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { appRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CARD_BASE,
  INFO_BOX_XL,
  SELECTED_CARD,
} from "./inventory-constants";
import { STOCK } from "./inventory-messages";
import {
  type InventoryDetailResponse,
  getProductStatusTone,
} from "./inventory-summary-shared";

export default function InventoryDetailPage() {
  const routeParams = useParams<{ styleId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleId = String(routeParams?.styleId || "");

  const { defaultLocation, locationsLoading } = useAuth();

  const urlLocationId = searchParams.get("location_id");
  const [selectedLocationId, setSelectedLocationId] = useState(
    urlLocationId || defaultLocation?.location_id || ""
  );
  const [refreshNonce, setRefreshNonce] = useState(0);

  const locationAutoSet = useRef(false);
  const selectedLocationRef = useRef(selectedLocationId);

  useEffect(() => {
    selectedLocationRef.current = selectedLocationId;
  }, [selectedLocationId]);

  useEffect(() => {
    if (
      !locationAutoSet.current &&
      !urlLocationId &&
      !locationsLoading &&
      defaultLocation?.location_id
    ) {
      locationAutoSet.current = true;
      setSelectedLocationId(defaultLocation.location_id);
    }
  }, [locationsLoading, defaultLocation?.location_id, urlLocationId]);

  const { data: detail, loading, error } = useApiGet(
    () => {
      if (!styleId) return Promise.resolve(null as InventoryDetailResponse | null);

      const params = new URLSearchParams();
      if (selectedLocationId) {
        params.set("location_id", selectedLocationId);
      }

      return apiFetchData<InventoryDetailResponse>(
        `/api/inventory/styles/${styleId}${params.toString() ? `?${params.toString()}` : ""}`,
        { cache: "no-store", suppressAuthEvent: true }
      );
    },
    [styleId, selectedLocationId, refreshNonce]
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedLocationId) {
      params.set("location_id", selectedLocationId);
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, selectedLocationId]);

  useEffect(() => {
    if (!detail) return;

    const nextLocationId = detail.meta.selected_location_id || "";
    if (!nextLocationId) return;

    const currentId = selectedLocationRef.current;
    const isCurrentValid = detail.meta.available_locations.some(
      (loc) => loc.location_id === currentId
    );
    if (!currentId || !isCurrentValid) {
      setSelectedLocationId(nextLocationId);
    }
  }, [detail]);

  const locationOptions = useMemo(() => {
    const available = detail?.meta.available_locations || [];
    return available.map((location) => ({
      value: location.location_id,
      label: location.name,
      badge: location.is_default ? STOCK.locationBadge.defaultBadge : undefined,
      tone: location.is_default ? ("accent" as const) : undefined,
    }));
  }, [detail?.meta.available_locations]);

  const selectedLocationName = useMemo(() => {
    const loc = detail?.meta.available_locations.find(
      (l) => l.location_id === selectedLocationId
    );
    return loc?.name || "";
  }, [detail?.meta.available_locations, selectedLocationId]);

  const otherLocations = useMemo(() => {
    if (!detail) return [];
    return detail.locations.filter(
      (loc) => loc.location_id !== detail.matrix.selected_location_id
    );
  }, [detail]);

  const backHref = selectedLocationId
    ? `${appRoutes.inventory}?location_id=${encodeURIComponent(selectedLocationId)}`
    : appRoutes.inventory;

  const kardexHref = detail
    ? `${appRoutes.inventoryMovements}?${new URLSearchParams(
        (() => {
          const p: Record<string, string> = { query: detail.style.style_code };
          if (detail.matrix.selected_location_id) {
            p.location_id = detail.matrix.selected_location_id;
          }
          return p;
        })()
      ).toString()}`
    : appRoutes.inventoryMovements;

  useSidebarTopbarBreadcrumbs(
    detail
      ? [
          { label: STOCK.detail.breadcrumbs.home, href: appRoutes.home },
          { label: STOCK.header.title, href: appRoutes.inventory },
          { label: detail.style.style_name },
        ]
      : [
          { label: STOCK.detail.breadcrumbs.home, href: appRoutes.home },
          { label: STOCK.header.title, href: appRoutes.inventory },
          { label: STOCK.detail.breadcrumbs.fallbackProduct },
        ]
  );

  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title={STOCK.detail.loading}
        description={STOCK.detail.loadingDesc}
      />
    );
  }

  if (error) {
    return (
      <ErrorPage
        variant="ops"
        title={STOCK.detail.error}
        description={error}
        onReset={() => setRefreshNonce((current) => current + 1)}
      />
    );
  }

  if (!detail) {
    return <NotFoundPage variant="ops" />;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide" className="space-y-5">
        <PosHeader
          eyebrow={STOCK.header.eyebrow}
          title={detail.style.style_name}
          meta={
            <div className="flex flex-wrap gap-2">
              <OpsStatusBadge
                tone="neutral"
                size="sm"
                icon={<MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />}
              >
                {selectedLocationName || STOCK.footer.scopeAll}
              </OpsStatusBadge>
              <OpsStatusBadge
                tone={getProductStatusTone(detail.summary.status)}
                size="sm"
              >
                {detail.summary.status_label}
              </OpsStatusBadge>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                <Link href={backHref}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {STOCK.detail.back}
                </Link>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={() => setRefreshNonce((current) => current + 1)}
                    aria-label={STOCK.detail.refresh}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {STOCK.detail.refresh}
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        <div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-[var(--ops-text-muted)]">
                {detail.style.style_code}
                {detail.style.garment_type_name
                  ? ` · ${detail.style.garment_type_name}`
                  : ` · ${STOCK.fallback.noType}`}
              </p>
              <p className="text-xs text-[var(--ops-text-muted)]">
                {STOCK.detail.fields.sizes}: {detail.summary.sizes_available} ·{" "}
                {STOCK.detail.fields.colors}: {detail.summary.colors_available}
              </p>
            </div>
            <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-52`}>
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}
              >
                {STOCK.detail.totalStock}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
                {detail.summary.stock_total}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
          <OpsPanelSection
            title={STOCK.detail.sections.matrix}
            icon={<Grid3X3 className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            aside={
              <div className="w-[220px]">
                <OpsSelect
                  label={STOCK.detail.matrix.locationLabel}
                  value={selectedLocationId}
                  options={locationOptions}
                  onChange={(value) => setSelectedLocationId(value)}
                />
              </div>
            }
          >
            <div
              className={cn(
                "-mx-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl -mb-[var(--ops-panel-padding)]",
                loading && detail && "opacity-50 transition-opacity duration-150 pointer-events-none"
              )}
            >
              <OpsTableWrap minWidth="600px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">{STOCK.detail.matrix.colorSize}</th>
                      {detail.matrix.sizes.map((size) => (
                        <th key={size.size_id} className="px-3 py-3 text-center">
                          {size.size_code}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center">{STOCK.detail.matrix.total}</th>
                      <th className="px-3 py-3">{STOCK.detail.matrix.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {detail.matrix.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={(detail.matrix.sizes.length || 1) + 3}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          {STOCK.detail.matrix.empty}
                        </td>
                      </tr>
                    ) : (
                      detail.matrix.rows.map((row) => (
                        <tr
                          key={row.color_id}
                          className="transition hover:bg-[var(--ops-surface-muted)]"
                        >
                          <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                            {row.color_name}
                          </td>
                          {row.cells.map((cell) => (
                            <td
                              key={`${row.color_id}-${cell.size_id}`}
                              className="px-3 py-[var(--ops-row-py)] text-center text-sm text-[var(--ops-text)]"
                            >
                              <span
                                className={cell.qty === 0 ? "text-[var(--ops-text-muted)]" : ""}
                              >
                                {cell.qty}
                              </span>
                            </td>
                          ))}
                          <td className="px-3 py-[var(--ops-row-py)] text-center text-sm font-semibold text-[var(--ops-text)]">
                            {row.total_qty}
                          </td>
                          <td className="px-3 py-[var(--ops-row-py)]">
                            <OpsStatusBadge
                              tone={getProductStatusTone(row.status)}
                              size="xs"
                            >
                              {row.status_label}
                            </OpsStatusBadge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>
            </div>
          </OpsPanelSection>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <OpsPanelSection
              title={STOCK.detail.sections.locations}
              icon={<Building2 className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              {otherLocations.length === 0 ? (
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {STOCK.detail.locations.empty}
                </p>
              ) : (
                <div className="grid gap-2">
                  {otherLocations.map((location) => (
                    <div
                      key={location.location_id}
                      className={cn(
                        "rounded-xl border px-3 py-3",
                        location.location_id === selectedLocationId
                          ? SELECTED_CARD
                          : CARD_BASE
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {location.location_name}
                        </p>
                        <OpsStatusBadge
                          tone={getProductStatusTone(location.status)}
                          size="xs"
                        >
                          {location.status_label}
                        </OpsStatusBadge>
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
                        {STOCK.detail.locations.units(location.stock_total)} ·{" "}
                        {STOCK.detail.locations.variants(location.variants_with_stock)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </OpsPanelSection>

            <OpsPanelSection
              title={STOCK.detail.sections.movements}
              icon={<RefreshCw className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              <p className="text-sm text-[var(--ops-text-muted)]">
                {STOCK.detail.movements.description}
              </p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={kardexHref}>{STOCK.detail.movements.link}</Link>
                </Button>
              </div>
            </OpsPanelSection>
          </aside>
        </div>
      </OpsPageShell>
    </TooltipProvider>
  );
}
