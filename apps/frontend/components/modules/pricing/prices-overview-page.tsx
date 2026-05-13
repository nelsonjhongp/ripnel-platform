"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { Pagination } from "@/components/ui/pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchPriceCatalog } from "@/lib/api-prices"
import type { PriceCatalogRow } from "@/lib/prices-types"

const PAGE_SIZE = 10

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

function getStatusMeta(item: PriceCatalogRow) {
  const allCovered =
    item.retail_sizes_covered_count === item.configured_size_count &&
    item.wholesale_sizes_covered_count === item.configured_size_count

  if (allCovered) {
    return {
      label: "Completo",
      className:
        "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]",
    }
  }

  if (item.total_stock_qty === 0) {
    return {
      label: "Sin precios",
      className:
        "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]",
    }
  }

  const hasSomeCoverage =
    item.retail_sizes_covered_count > 0 || item.wholesale_sizes_covered_count > 0

  if (hasSomeCoverage) {
    return {
      label: "Parcial",
      className:
        "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]",
    }
  }

  return {
    label: "Faltan precios",
    className:
      "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]",
  }
}

export function PricesOverviewPage() {
  const [items, setItems] = useState<PriceCatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [coverage, setCoverage] = useState("all")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchPriceCatalog({
        q: search.trim() || undefined,
        coverage,
        status,
      })
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el modulo de precios")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [coverage, search, status])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    setPage(1)
  }, [search, coverage, status])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, safePage])

  const firstVisible = items.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const lastVisible = visibleItems.length === 0 ? 0 : firstVisible + visibleItems.length - 1

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

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
                  onClick={() => void loadItems()}
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
              onChange={setSearch}
              placeholder="Buscar por style, codigo o tela"
              ariaLabel="Buscar estilos de precios"
            />

            <FilterDropdown
              label="Cobertura"
              value={coverage}
              options={COVERAGE_OPTIONS}
              onChange={setCoverage}
            />

            <FilterDropdown
              label="Estado"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
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

          <OpsTableWrap minWidth="1120px">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Tallas</th>
                  <th className="px-4 py-3">Retail</th>
                  <th className="px-4 py-3">Mayorista</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                    >
                      Cargando cobertura...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                    >
                      {error}
                    </td>
                  </tr>
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                    >
                      No hay styles para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => {
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
                          <div className="flex flex-wrap gap-1">
                            {item.size_codes && item.size_codes.length > 0 ? (
                              <>
                                {item.size_codes.slice(0, 5).map((code) => (
                                  <span
                                    key={code}
                                    className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-text-muted)]"
                                  >
                                    {code}
                                  </span>
                                ))}
                                {item.size_codes.length > 5 ? (
                                  <span className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                                    +{item.size_codes.length - 5}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                                {item.configured_size_count} talla{item.configured_size_count === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-[var(--ops-row-py)]">
                          <CoverageBar current={item.retail_sizes_covered_count} total={item.configured_size_count} />
                        </td>

                        <td className="px-4 py-[var(--ops-row-py)]">
                          <CoverageBar current={item.wholesale_sizes_covered_count} total={item.configured_size_count} />
                        </td>

                        <td className="px-4 py-[var(--ops-row-py)]">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
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
                  })
                )}
              </tbody>
            </table>
          </OpsTableWrap>

          <OpsTableFooter>
            <span className="text-sm text-[var(--ops-text-muted)]">
              {items.length === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${items.length}`}
            </span>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </OpsTableFooter>
        </OpsTableBlock>
      </OpsSectionDivider>
    </TooltipProvider>
  )
}
