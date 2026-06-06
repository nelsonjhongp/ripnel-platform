"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CoverageBar } from "./coverage-bar"
import { PencilLine, RefreshCw, RotateCcw, Settings2 } from "lucide-react"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
import {
  OpsFiltersRow,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { Pagination } from "@/components/ui/pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchPriceCatalog } from "@/lib/api-prices"
import type { PriceCatalogRow } from "@/lib/prices-types"
import { usePagination } from "@/hooks/use-pagination"
import { useApiGet } from "@/hooks/use-api-get"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"

const COVERAGE_OPTIONS = [
  { value: "all", label: "Toda cobertura" },
  { value: "missing_retail", label: "Sin retail completo" },
  { value: "missing_wholesale", label: "Sin mayorista completo" },
  { value: "stock_without_retail", label: "Con stock sin retail" },
] as const

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending_prices", label: "Faltan precios" },
  { value: "pending_variants", label: "Faltan variantes" },
  { value: "ready", label: "Listos" },
  { value: "ready_no_stock", label: "Listos sin stock" },
  { value: "draft", label: "Borradores" },
  { value: "inactive", label: "Inactivos" },
] as const

function getStatusMeta(item: PriceCatalogRow): { label: string; tone: "success" | "neutral" | "warning" | "danger" } {
  const allCovered =
    item.retail_sizes_covered_count === item.configured_size_count &&
    item.wholesale_sizes_covered_count === item.configured_size_count

  if (allCovered) {
    return { label: "Completo", tone: "success" }
  }

  if (item.total_stock_qty === 0) {
    return { label: "Sin precios", tone: "neutral" }
  }

  const hasSomeCoverage =
    item.retail_sizes_covered_count > 0 || item.wholesale_sizes_covered_count > 0

  if (hasSomeCoverage) {
    return { label: "Parcial", tone: "warning" }
  }

  return { label: "Faltan precios", tone: "danger" }
}

export function PricesOverviewPage() {
  const [search, setSearch] = useState("")
  const [coverage, setCoverage] = useState("all")
  const [status, setStatus] = useState("all")
  const { data: catalog, loading, error, refetch } = useApiGet(
    () => fetchPriceCatalog({ q: search.trim() || undefined, coverage, status }),
    [coverage, search, status]
  )
  const items = catalog ?? []

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
    <TooltipProvider delayDuration={120}>
      <PosHeader
        eyebrow="Precios"
        title="Cobertura de precios"
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  aria-label="Actualizar"
                  className="rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Actualizar
              </TooltipContent>
            </Tooltip>

            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href="/precios/reglas">
                <Settings2 className="h-4 w-4" />
                Reglas
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Estilos" value={metrics.totalStyles} />
        <OpsMetricPill label="Con retail" value={metrics.retailComplete} tone="success" />
        <OpsMetricPill label="Con mayorista" value={metrics.wholesaleComplete} tone="success" />
        <OpsMetricPill label="Faltan precios" value={metrics.missingPrices} tone="warning" />
        <OpsMetricPill label="Sin precios" value={metrics.withoutPrices} />
      </div>

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow>
            <OpsSearchField
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Buscar por style, codigo o tela"
              ariaLabel="Buscar estilos de precios"
            />

            <FilterDropdown
              label="Cobertura"
              value={coverage}
              options={COVERAGE_OPTIONS}
              onChange={(value) => {
                setCoverage(value)
                setPage(1)
              }}
            />

            <FilterDropdown
              label="Estado"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  aria-label="Limpiar filtros"
                  className="mt-auto h-10 w-10 rounded-lg"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Limpiar filtros
              </TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          <OpsDataTable
            columns={[
              { key: "producto", header: "Producto" },
              { key: "tallas", header: "Tallas" },
              { key: "retail", header: "Retail" },
              { key: "mayorista", header: "Mayorista" },
              { key: "estado", header: "Estado" },
              { key: "accion", header: "", className: "text-right" },
            ]}
            minWidth="1120px"
            loading={loading}
            loadingMessage="Cargando cobertura..."
            error={error}
            errorTitle="Error al cargar cobertura"
            isEmpty={!loading && !error && visibleItems.length === 0}
            emptyMessage="No hay styles para los filtros actuales."
            footer={
              <>
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {items.length === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${items.length}`}
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
                      {item.style_code || "Sin código"}
                    </p>
                  </td>

                  <td className="px-4 py-[var(--ops-row-py)]">
                    <OpsStatusBadge tone={statusMeta.tone}>
                      {statusMeta.label}
                    </OpsStatusBadge>
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
                        Gestionar
                      </Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </OpsDataTable>
        </OpsTableBlock>
      </OpsSectionDivider>
    </TooltipProvider>
  )
}
