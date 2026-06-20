"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { useSidebarTopbarBreadcrumbs } from "@/components/sidebar/SidebarShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
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
  const [refreshNonce, setRefreshNonce] = useState(0);

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
    ? `${appRoutes.inventoryMovements}?${new URLSearchParams({
        query: detail.style.style_code,
        ...(selectedLocation?.location_code ? { location: selectedLocation.location_code } : {}),
      }).toString()}`
    : appRoutes.inventoryMovements;

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
            <OpsDataTable
              columns={[
                { key: "sede", header: "Sede" },
                { key: "stock_total", header: "Stock total" },
                { key: "variantes_stock", header: "Variantes con stock" },
                { key: "estado", header: "Estado" },
              ]}
              minWidth="880px"
            >
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
            </OpsDataTable>
          </OpsTableBlock>
        ) : null}

        {tab === "matrix" ? (
          <OpsTableBlock>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ops-text)]">Matriz por talla y color</h2>
              </div>
            </div>

            <OpsDataTable
              columns={[
                { key: "color", header: "Color / Talla" },
                ...detail.matrix.sizes.map((size) => ({ key: `size_${size.size_id}`, header: size.size_code })),
                { key: "total", header: "Total" },
                { key: "estado", header: "Estado" },
              ]}
              minWidth="920px"
              emptyMessage="No hay matriz disponible para la sede seleccionada."
              isEmpty={detail.matrix.rows.length === 0}
            >
              {detail.matrix.rows.map((row) => (
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
              ))}
            </OpsDataTable>
          </OpsTableBlock>
        ) : null}

        {tab === "movements" ? (
          <section className="rounded-2xl border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-5 py-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">Movimientos de stock</h2>
              <p className="text-sm text-[var(--ops-text-muted)]">{detail.movements.message}</p>
              <p className="text-sm text-[var(--ops-text-muted)]">
                Aquí verás entradas, salidas, transferencias, ventas y ajustes que impactan el stock.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={kardexHref}>Ver movimientos de stock</Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
