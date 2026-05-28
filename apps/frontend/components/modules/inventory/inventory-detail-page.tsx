"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  ErrorPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { useSidebarTopbarBreadcrumbs } from "@/components/sidebar/SidebarShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { appRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  type InventoryDetailResponse,
  type InventoryDetailTab,
  getProductStatusTone,
  normalizeInventoryDetailTab,
} from "./inventory-summary-shared";

export default function InventoryDetailPage() {
  const params = useParams<{ styleId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleId = String(params?.styleId || "");

  const [tab, setTab] = useState<InventoryDetailTab>(
    normalizeInventoryDetailTab(searchParams.get("tab"))
  );
  const [selectedLocationId, setSelectedLocationId] = useState(searchParams.get("location_id") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InventoryDetailResponse | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadDetail = useCallback(async () => {
    if (!styleId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedLocationId) {
        params.set("location_id", selectedLocationId);
      }

      const payload = await apiFetch<{ ok: boolean; data: InventoryDetailResponse }>(
        `/api/inventory/styles/${styleId}${params.toString() ? `?${params.toString()}` : ""}`,
        {
          cache: "no-store",
          suppressAuthEvent: true,
        }
      );

      setDetail(unwrapApiData(payload) ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el detalle del producto."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, styleId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDetail, refreshNonce]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedLocationId) {
      params.set("location_id", selectedLocationId);
    }

    if (tab !== "summary") {
      params.set("tab", tab);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, selectedLocationId, tab]);

  const locationOptions = useMemo(() => {
    const availableLocations = detail?.meta.available_locations || [];

    return availableLocations.map((location) => ({
      value: location.location_id,
      label: location.name,
      badge: location.is_default ? "Actual" : undefined,
      tone: location.is_default ? ("accent" as const) : undefined,
    }));
  }, [detail?.meta.available_locations]);

  useEffect(() => {
    if (!detail) return;

    const nextLocationId = detail.meta.selected_location_id || "";
    if (!nextLocationId) return;

    const isCurrentValid = locationOptions.some((option) => option.value === selectedLocationId);
    if (!selectedLocationId || !isCurrentValid) {
      const timer = window.setTimeout(() => {
        setSelectedLocationId(nextLocationId);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [detail, locationOptions, selectedLocationId]);

  const selectedLocation = detail?.locations.find((location) => location.location_id === detail?.matrix.selected_location_id) || null;
  const backHref =
    selectedLocationId
      ? `${appRoutes.inventory}?location_id=${encodeURIComponent(selectedLocationId)}`
      : appRoutes.inventory;
  const kardexHref = detail
    ? `${appRoutes.kardex}?${new URLSearchParams({
        query: detail.style.style_code,
        ...(selectedLocation?.location_code ? { location: selectedLocation.location_code } : {}),
      }).toString()}`
    : appRoutes.kardex;

  useSidebarTopbarBreadcrumbs(
    detail
      ? [
          { label: "Inicio", href: appRoutes.home },
          { label: "Stock actual", href: appRoutes.inventory },
          { label: detail.style.style_name },
        ]
      : [
          { label: "Inicio", href: appRoutes.home },
          { label: "Stock actual", href: appRoutes.inventory },
          { label: "Producto" },
        ]
  );

  if (loading) {
    return (
      <LoadingPage
        variant="ops"
        title="Cargando detalle de stock"
        description="Estamos preparando el resumen por sede y la matriz de tallas y colores."
      />
    );
  }

  if (error) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir el detalle de stock"
        description={error}
        onReset={() => setRefreshNonce((current) => current + 1)}
      />
    );
  }

  if (!detail) {
    return <NotFoundPage variant="ops" />;
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow="INVENTARIO"
        title={detail.style.style_name}
        description={`${detail.style.style_code} · ${detail.style.garment_type_name || "Sin tipo"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={backHref}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a stock actual
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => setRefreshNonce((current) => current + 1)}
              aria-label="Actualizar detalle"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Stock total" value={detail.summary.stock_total} tone="accent" />
        <OpsMetricPill label="Tallas disponibles" value={detail.summary.sizes_available} />
        <OpsMetricPill label="Colores disponibles" value={detail.summary.colors_available} />
      </div>

      <OpsSectionDivider className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(nextValue) => setTab(nextValue as InventoryDetailTab)}>
            <TabsList variant="ops" className="max-w-full">
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="locations">Por sede</TabsTrigger>
              <TabsTrigger value="matrix">Tallas y colores</TabsTrigger>
              <TabsTrigger value="movements">Movimientos</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full sm:w-[260px]">
            <FilterDropdown
              label="Sede"
              value={selectedLocationId}
              options={locationOptions}
              onChange={(value) => setSelectedLocationId(value)}
            />
          </div>
        </div>

        {tab === "summary" ? (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-4 rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">Resumen</h2>
              <div className="space-y-3 text-sm text-[var(--ops-text)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--ops-text-muted)]">Código</span>
                  <span className="font-medium">{detail.style.style_code}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--ops-text-muted)]">Tipo</span>
                  <span className="font-medium">{detail.style.garment_type_name || "Sin tipo"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--ops-text-muted)]">Tallas disponibles</span>
                  <span className="font-medium">{detail.summary.sizes_available}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--ops-text-muted)]">Colores disponibles</span>
                  <span className="font-medium">{detail.summary.colors_available}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--ops-text-muted)]">Estado general</span>
                  <OpsStatusBadge tone={getProductStatusTone(detail.summary.status)} size="xs">
                    {detail.summary.status_label}
                  </OpsStatusBadge>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">Stock por sede</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.locations.map((location) => (
                  <div
                    key={location.location_id}
                    className={cn(
                      "rounded-xl border px-3 py-3",
                      location.location_id === detail.matrix.selected_location_id
                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))]"
                        : "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">{location.location_name}</p>
                      <OpsStatusBadge tone={getProductStatusTone(location.status)} size="xs">
                        {location.status_label}
                      </OpsStatusBadge>
                    </div>
                    <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
                      {location.stock_total} unidades · {location.variants_with_stock} variantes con stock
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "locations" ? (
          <OpsTableBlock>
            <OpsTableWrap minWidth="880px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Sede</th>
                    <th className="px-4 py-3">Stock total</th>
                    <th className="px-4 py-3">Variantes con stock</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {detail.locations.map((location) => (
                    <tr key={location.location_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                      <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                        {location.location_name}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                        {location.stock_total}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                        {location.variants_with_stock}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <OpsStatusBadge tone={getProductStatusTone(location.status)} size="xs">
                          {location.status_label}
                        </OpsStatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OpsTableWrap>
          </OpsTableBlock>
        ) : null}

        {tab === "matrix" ? (
          <OpsTableBlock>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ops-text)]">Matriz por talla y color</h2>
              </div>
            </div>

            <OpsTableWrap minWidth="920px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Color / Talla</th>
                    {detail.matrix.sizes.map((size) => (
                      <th key={size.size_id} className="px-4 py-3">
                        {size.size_code}
                      </th>
                    ))}
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {detail.matrix.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={detail.matrix.sizes.length + 3}
                        className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                      >
                        No hay matriz disponible para la sede seleccionada.
                      </td>
                    </tr>
                  ) : (
                    detail.matrix.rows.map((row) => (
                      <tr key={row.color_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                        <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                          {row.color_name}
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={`${row.color_id}-${cell.size_id}`}
                            className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]"
                          >
                            <span className={cell.qty === 0 ? "text-[var(--ops-text-muted)]" : ""}>
                              {cell.qty}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                          {row.total_qty}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <OpsStatusBadge tone={getProductStatusTone(row.status)} size="xs">
                            {row.status_label}
                          </OpsStatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </OpsTableWrap>
          </OpsTableBlock>
        ) : null}

        {tab === "movements" ? (
          <section className="rounded-2xl border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-5 py-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">Movimientos</h2>
              <p className="text-sm text-[var(--ops-text-muted)]">{detail.movements.message}</p>
              <p className="text-sm text-[var(--ops-text-muted)]">
                Aquí se mostrarán entradas, salidas, transferencias, ventas y ajustes de inventario.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={kardexHref}>Ver Kardex</Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
