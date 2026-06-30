"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CoverageBar } from "./coverage-bar"
import { PencilLine, RefreshCw, RotateCcw, Settings2 } from "lucide-react"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { OpsSelect } from "@/components/ui/ops-selection"
import {
  OpsFiltersRow,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { Pagination } from "@/components/ui/pagination"
import { fetchPriceCatalog } from "@/lib/api-prices"
import type { PriceCatalogRow } from "@/lib/prices-types"
import { usePagination } from "@/hooks/use-pagination"
import { useApiGet } from "@/hooks/use-api-get"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PRICE } from "./pricing-messages"

const COVERAGE_OPTIONS = [
  { value: "all", label: PRICE.overview.coverageAll },
  { value: "missing_retail", label: PRICE.overview.coverageMissingRetail },
  { value: "missing_wholesale", label: PRICE.overview.coverageMissingWholesale },
  { value: "stock_without_retail", label: PRICE.overview.coverageStockWithoutRetail },
] as const

const STATUS_OPTIONS = [
  { value: "all", label: PRICE.overview.statusAll },
  { value: "pending_prices", label: PRICE.overview.statusMissingPrices },
  { value: "pending_variants", label: PRICE.overview.statusMissingVariants },
  { value: "ready", label: PRICE.overview.statusReady },
  { value: "ready_no_stock", label: PRICE.overview.statusReadyNoStock },
  { value: "draft", label: PRICE.overview.statusDraft },
  { value: "inactive", label: PRICE.overview.statusInactive },
] as const

function getStatusMeta(item: PriceCatalogRow): { label: string; tone: "success" | "neutral" | "warning" | "danger" } {
  const allCovered =
    item.retail_sizes_covered_count === item.configured_size_count &&
    item.wholesale_sizes_covered_count === item.configured_size_count

  if (allCovered) {
    return { label: PRICE.overview.statusReady, tone: "success" }
  }

  if (item.total_stock_qty === 0) {
    return { label: PRICE.overview.metrics.withoutPrices, tone: "neutral" }
  }

  const hasSomeCoverage =
    item.retail_sizes_covered_count > 0 || item.wholesale_sizes_covered_count > 0

  if (hasSomeCoverage) {
    return { label: "Parcial", tone: "warning" }
  }

  return { label: PRICE.overview.statusMissingPrices, tone: "danger" }
}

export function PricesOverviewPage() {
  const [search, setSearch] = useState("")
  const [coverage, setCoverage] = useState("all")
  const [status, setStatus] = useState("all")
  const { data: catalog, loading, error, refetch } = useApiGet(
    () => fetchPriceCatalog({ q: search.trim() || undefined, coverage, status }),
    [coverage, search, status]
  )
  const items = useMemo(() => catalog ?? [], [catalog])

  const { paginatedItems: visibleItems, totalPages, safePage, firstVisible, lastVisible, setPage } = usePagination(items)

  const metrics = useMemo(() => {
    const totalStyles = items.length
    const retailComplete = items.filter(
      (i) => i.retail_sizes_covered_count === i.configured_size_count
    ).length
    const wholesaleComplete = items.filter(
      (i) => i.wholesale_sizes_covered_count === i.configured_size_count
    ).length
    const missingPrices = items.filter(
      (i) => i.missing_retail_size_count > 0 || i.missing_wholesale_size_count > 0
    ).length
    const withoutPrices = items.filter((i) => i.total_stock_qty === 0).length

    return { totalStyles, retailComplete, wholesaleComplete, missingPrices, withoutPrices }
  }, [items])

  const hasActiveFilters =
    search.trim().length > 0 || coverage !== "all" || status !== "all"

  function clearFilters() {
    setSearch("")
    setCoverage("all")
    setStatus("all")
    setPage(1)
  }

  return (
    <>
      <PosHeader
        eyebrow={PRICE.header.overview.eyebrow}
        title={PRICE.header.overview.title}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => refetch()}
              disabled={loading}
              aria-label={PRICE.header.refresh}
              className="rounded-lg"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href="/precios/reglas">
                <Settings2 className="h-4 w-4" />
                {PRICE.header.rulesLink}
              </Link>
            </Button>
          </>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: PRICE.overview.metrics.styles, value: metrics.totalStyles },
          { label: PRICE.overview.metrics.withRetail, value: metrics.retailComplete, tone: "success" },
          { label: PRICE.overview.metrics.withWholesale, value: metrics.wholesaleComplete, tone: "success" },
          { label: PRICE.overview.metrics.missingPrices, value: metrics.missingPrices, tone: "warning" },
          { label: PRICE.overview.metrics.withoutPrices, value: metrics.withoutPrices },
        ]}
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow>
            <OpsSearchField
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder={PRICE.overview.searchPlaceholder}
              ariaLabel={PRICE.overview.searchAria}
            />

            <OpsSelect
              label={PRICE.overview.coverage}
              value={coverage}
              options={COVERAGE_OPTIONS}
              onChange={(value) => {
                setCoverage(value)
                setPage(1)
              }}
            />

            <OpsSelect
              label={PRICE.overview.status}
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              aria-label={PRICE.overview.clearFilters}
              className="mt-auto h-10 w-10 rounded-lg"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </OpsFiltersRow>

          <OpsDataTable
            columns={[
              { key: "producto", header: PRICE.overview.columns.product },
              { key: "tallas", header: PRICE.overview.columns.sizes },
              { key: "retail", header: PRICE.overview.columns.retail },
              { key: "mayorista", header: PRICE.overview.columns.wholesale },
              { key: "estado", header: PRICE.overview.columns.status },
              { key: "accion", header: "", className: "text-right" },
            ]}
            minWidth="1120px"
            loading={loading}
            loadingMessage={PRICE.overview.loading}
            error={error}
            errorTitle={PRICE.overview.errorTitle}
            isEmpty={!loading && !error && visibleItems.length === 0}
            emptyMessage={PRICE.overview.emptyMessage}
            footer={
              <>
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {items.length === 0 ? PRICE.overview.zeroResults : `${firstVisible}-${lastVisible} de ${items.length}`}
                </span>
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} className="self-end md:self-auto" />
              </>
            }
          >
            {visibleItems.map((item) => {
              const statusMeta = getStatusMeta(item)

              return (
                <tr
                  key={item.style_id}
                  className="transition hover:bg-[var(--ops-surface-muted)]"
                >
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {item.style_name}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      {item.style_code || PRICE.overview.noCode}
                    </p>
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {PRICE.overview.sizeLabel(item.configured_size_count)}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      R {item.retail_sizes_covered_count}/{item.configured_size_count} · M {item.wholesale_sizes_covered_count}/{item.configured_size_count}
                    </p>
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)]">
                    <CoverageBar current={item.retail_sizes_covered_count} total={item.configured_size_count} />
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)]">
                    <CoverageBar current={item.wholesale_sizes_covered_count} total={item.configured_size_count} />
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)]">
                    <OpsStatusBadge tone={statusMeta.tone}>
                      {statusMeta.label}
                    </OpsStatusBadge>
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)] text-right">
                    <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                      <Link href={`/precios/crear?style_id=${item.style_id}`}>
                        <PencilLine className="h-3.5 w-3.5" />
                        {PRICE.overview.manage}
                      </Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </OpsDataTable>
        </OpsTableBlock>
      </OpsSectionDivider>
    </>
  )
}
