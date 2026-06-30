"use client";

import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  CircleAlert,
  Eye,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Shapes,
} from "lucide-react";
import { AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProductCreateDialog } from "./product-create-dialog";
import { PRODUCTS } from "./products-messages";
import {
  STATUS_DOT_INACTIVE,
  STATUS_DOT_DRAFT,
  STATUS_DOT_PENDING_VARIANTS,
  STATUS_DOT_PENDING_PRICES,
  STATUS_DOT_READY_NO_STOCK,
  STATUS_DOT_READY,
  WARNING_CHIP_WHOLESALE,
  WARNING_CHIP_STOCK_NO_RETAIL,
  SURFACE_MUTED_BG,
} from "./products-constants";
import type { ProductStatus } from "@/types/products";

type ProductSizeStock = {
  size_id: string;
  size_code: string;
  qty: number;
};

type ProductSummary = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  garment_type_name: string;
  configured_size_count: number;
  size_codes: string[];
  size_stock: ProductSizeStock[];
  configured_color_count: number;
  expected_variant_count: number;
  variant_count: number;
  active_variant_count: number;
  total_stock_qty: number;
  retail_sizes_covered_count: number;
  wholesale_sizes_covered_count: number;
  missing_retail_size_count: number;
  missing_wholesale_size_count: number;
  sizes_with_stock_without_retail_count: number;
  status: ProductStatus;
  warnings: {
    missing_wholesale_prices: boolean;
    stock_without_retail_price: boolean;
  };
};

type FilterMode = "all" | "attention" | "ready" | "inactive";

type ActiveLocation = {
  location_id: string;
  name: string;
  code: string | null;
  type: string;
  address: string | null;
  active: boolean;
};

type ProductsResponse = {
  items: ProductSummary[];
  active_location: ActiveLocation | null;
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

const STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
  inactive: {
    label: PRODUCTS.statusLabels.inactive,
    className: STATUS_DOT_INACTIVE,
  },
  draft: {
    label: PRODUCTS.statusLabels.draft,
    className: STATUS_DOT_DRAFT,
  },
  pending_variants: {
    label: PRODUCTS.statusLabels.pendingVariants,
    className: STATUS_DOT_PENDING_VARIANTS,
  },
  pending_prices: {
    label: PRODUCTS.statusLabels.pendingPrices,
    className: STATUS_DOT_PENDING_PRICES,
  },
  ready_no_stock: {
    label: PRODUCTS.statusLabels.readyNoStock,
    className: STATUS_DOT_READY_NO_STOCK,
  },
  ready: {
    label: PRODUCTS.statusLabels.ready,
    className: STATUS_DOT_READY,
  },
};

const PAGE_SIZE = 10;

function getVisibleSizeStock(sizeStock: ProductSizeStock[]) {
  return sizeStock.slice(0, 4);
}

function buildStyleHref(path: string, styleId: string) {
  return `${path}?style_id=${encodeURIComponent(styleId)}`;
}

function formatExtraSizes(extraSizes: ProductSizeStock[]) {
  return extraSizes.map((size) => `${size.size_code}: ${size.qty}`).join(" · ");
}

export function ProductsOverviewPage({
  initialCreateOpen = false,
}: {
  initialCreateOpen?: boolean;
}) {
  const router = useRouter();
  const { defaultLocation, locationAssignments } = useAuth();
  const [response, setResponse] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const deferredSearch = useDeferredValue(search.trim());
  const effectiveLocationId = useMemo(() => {
    if (
      selectedLocationId &&
      locationAssignments.some((assignment) => assignment.location_id === selectedLocationId)
    ) {
      return selectedLocationId;
    }

    return defaultLocation?.location_id || locationAssignments[0]?.location_id || "";
  }, [defaultLocation?.location_id, locationAssignments, selectedLocationId]);

  const products = useMemo(() => response?.items ?? [], [response?.items]);
  const totalItems = response?.pagination.total_items || 0;
  const totalPages = response?.pagination.total_pages || 1;

  const paginationSource = useMemo(
    () => Array.from({ length: totalItems }),
    [totalItems]
  );

  const {
    page: safePage,
    firstVisible,
    setPage,
  } = usePagination(paginationSource, PAGE_SIZE);

  const visibleTo = totalItems ? firstVisible + products.length - 1 : 0;

  const loadProducts = useCallback(async () => {
    if (!effectiveLocationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(safePage),
        page_size: String(PAGE_SIZE),
        filter_mode: filterMode,
        location_id: effectiveLocationId,
      });

      if (deferredSearch) {
        params.set("q", deferredSearch);
      }

      const apiResponse = await apiFetch<ApiEnvelope<ProductsResponse> | ProductsResponse>(
        `/api/products?${params.toString()}`
      );
      const payload = unwrapApiData(apiResponse);

      setResponse(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : PRODUCTS.table.errorTitle
      );
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, effectiveLocationId, filterMode, safePage]);

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  const readyCount = useMemo(
    () => products.filter((p) => p.status === "ready").length,
    [products]
  );
  const pendingCount = useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === "draft" ||
          p.status === "pending_variants" ||
          p.status === "pending_prices" ||
          p.status === "ready_no_stock"
      ).length,
    [products]
  );

  const hasActiveFilters = deferredSearch !== "" || filterMode !== "all";

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={PRODUCTS.header.eyebrow}
        title={PRODUCTS.header.overviewTitle}
        actions={
          <>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="rounded-lg px-3"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {PRODUCTS.actions.newProduct}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={loadProducts}
                  disabled={loading || !effectiveLocationId}
                  aria-label={PRODUCTS.actions.refresh}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>{PRODUCTS.actions.refresh}</TooltipContent>
            </Tooltip>
          </>
        }
      />

      <OpsMetricInlineGroup items={[
        { label: PRODUCTS.metrics.totalStyles, value: totalItems },
        { label: PRODUCTS.metrics.ready, value: readyCount, tone: "success" },
        { label: PRODUCTS.metrics.pending, value: pendingCount, tone: "warning" },
      ]} />

      <OpsSectionDivider className="space-y-4">
        <OpsFiltersRow>
          <OpsSearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={PRODUCTS.filters.searchPlaceholder}
            ariaLabel={PRODUCTS.filters.searchAriaLabel}
          />

          <OpsSelect
            label="Filtro"
            value={filterMode}
            options={[
              { value: "all", label: PRODUCTS.filters.all },
              { value: "attention", label: PRODUCTS.filters.pendingCompletion },
              { value: "ready", label: PRODUCTS.metrics.ready },
              { value: "inactive", label: PRODUCTS.filters.inactive },
            ]}
            onChange={(v) => {
              setFilterMode(v as FilterMode);
              setPage(1);
            }}
          />

          <OpsSelect
            label="Sede activa"
            value={effectiveLocationId}
            options={locationAssignments.map((assignment) => ({
              value: assignment.location_id,
              label: `${assignment.location.name}${assignment.is_default ? PRODUCTS.filters.defaultSuffix : ""}`,
            }))}
            onChange={(v) => {
              setSelectedLocationId(v);
              setPage(1);
            }}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterMode("all");
                  setPage(1);
                }}
                disabled={!hasActiveFilters}
                variant="outline"
                size="icon-sm"
                className="h-10 w-10 rounded-lg"
                aria-label={PRODUCTS.actions.clearFilters}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {PRODUCTS.actions.clearFilters}
            </TooltipContent>
          </Tooltip>
        </OpsFiltersRow>

        {!effectiveLocationId && !locationAssignments.length ? (
          <div className="mt-4 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-[var(--ops-text)]">{PRODUCTS.table.noLocationTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ops-text-muted)]">
              {PRODUCTS.table.noLocationDesc}
            </p>
          </div>
        ) : (
          <OpsDataTable
            columns={[
              { key: "producto", header: PRODUCTS.table.columns.product },
              { key: "sku", header: PRODUCTS.table.columns.code },
              { key: "tipo", header: PRODUCTS.table.columns.coverage },
              { key: "tallas", header: PRODUCTS.table.columns.sizes },
              { key: "stock", header: PRODUCTS.table.columns.stock },
              { key: "estado", header: PRODUCTS.table.columns.status },
              { key: "acciones", header: "", className: "text-right" },
            ]}
            minWidth="1080px"
            loading={loading}
            loadingMessage={PRODUCTS.table.loading}
            error={!loading ? error : null}
            errorTitle={PRODUCTS.table.errorTitle}
            isEmpty={!loading && !error && products.length === 0}
            emptyMessage={PRODUCTS.table.empty}
            footer={
              !loading && totalItems > 0 ? (
                <>
                  <span className="text-[var(--ops-text-muted)]">
                    {firstVisible}-{visibleTo} de {totalItems}
                  </span>
                  <Pagination
                    page={safePage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    className="self-end md:self-auto"
                  />
                </>
              ) : undefined
            }
          >
            {products.map((product) => {
              const statusMeta = STATUS_META[product.status];
              const visibleSizeStock = getVisibleSizeStock(product.size_stock || []);
              const extraSizes = (product.size_stock || []).slice(visibleSizeStock.length);

              return (
                <tr
                  key={product.style_id}
                  className="transition hover:bg-[var(--ops-surface-muted)]"
                >
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">{product.name}</p>
                    <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">{product.garment_type_name}</p>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{product.style_code || PRODUCTS.table.fallbackDash}</span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="space-y-1 text-[11px] text-[var(--ops-text-muted)]">
                      <p>{PRODUCTS.table.coverageLabels.retail} {product.retail_sizes_covered_count}/{product.configured_size_count}</p>
                      <p>{PRODUCTS.table.coverageLabels.wholesale} {product.wholesale_sizes_covered_count}/{product.configured_size_count}</p>
                    </div>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="flex flex-wrap gap-1">
                      {visibleSizeStock.length ? (
                        <>
                          {visibleSizeStock.map((size) => (
                            <span
                              key={`${product.style_id}-${size.size_id}`}
                              className={`inline-flex rounded-full border border-[var(--ops-border-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text)] ${SURFACE_MUTED_BG}`}
                            >
                              {size.size_code}: {size.qty}
                            </span>
                          ))}
                          {extraSizes.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-flex cursor-help rounded-full border border-[var(--ops-border-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)] ${SURFACE_MUTED_BG}`}>
                                  +{extraSizes.length}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="max-w-64 text-left"
                              >
                                {formatExtraSizes(extraSizes)}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-[var(--ops-text-muted)]">{PRODUCTS.table.noSizes}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="text-sm font-semibold">{product.total_stock_qty}</p>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          statusMeta.className
                        )}
                      >
                        {statusMeta.label}
                      </span>
                      {product.missing_wholesale_size_count > 0 ? (
                        <span className={WARNING_CHIP_WHOLESALE}>
                          {PRODUCTS.warnings.wholesaleShort}
                        </span>
                      ) : null}
                      {product.warnings.stock_without_retail_price ? (
                        <span className={WARNING_CHIP_STOCK_NO_RETAIL}>
                          <CircleAlert className="h-3 w-3" />
                          {PRODUCTS.warnings.stockWithoutRetail}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <AdminRowActionsMenu
                      ariaLabel={`Acciones para ${product.name}`}
                      items={[
                        {
                          label: PRODUCTS.actions.editStyle,
                          icon: <PencilLine className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(buildStyleHref("/productos/estilos", product.style_id)),
                        },
                        {
                          label: PRODUCTS.actions.variants,
                          icon: <Shapes className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(buildStyleHref("/productos/variantes", product.style_id)),
                        },
                        {
                          label: PRODUCTS.actions.prices,
                          icon: <ReceiptText className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(
                              buildStyleHref("/precios/crear", product.style_id)
                            ),
                        },
                        {
                          label: PRODUCTS.actions.history,
                          icon: <Eye className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(
                              buildStyleHref("/precios", product.style_id)
                            ),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </OpsDataTable>
        )}
      </OpsSectionDivider>
      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(style) => {
          void Promise.resolve().then(loadProducts);
          router.push(buildStyleHref("/productos/variantes", style.style_id));
        }}
      />
    </OpsPageShell>
  );
}
