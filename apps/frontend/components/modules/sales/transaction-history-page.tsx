"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { RotateCcw, Search } from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
import { Pagination } from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { formatDateTime } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/format-utils"
import { formatApiFetchError, apiFetch } from "@/lib/api"
import { buildSaleDetailRoute } from "@/lib/routes"
import { SALE_STATUS_META, SALE_STATUS_TONES, type SaleItem, type SalesPageResponse } from "@/types/sales"


const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  confirmed: SALE_STATUS_META.confirmed.label,
  draft: SALE_STATUS_META.draft.label,
  cancelled: SALE_STATUS_META.cancelled.label,
}

const STATUS_TONES: Record<string, string> = SALE_STATUS_TONES

export default function TransactionHistoryPage() {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (status !== "all") params.set("status", status)
        if (search.trim()) params.set("q", search.trim())
        if (dateFrom) params.set("date_from", dateFrom)
        if (dateTo) params.set("date_to", dateTo)
        params.set("limit", String(PAGE_SIZE))
        params.set("offset", String((currentPage - 1) * PAGE_SIZE))

        const path = `/api/sales?${params.toString()}`
        const data = await apiFetch<SalesPageResponse>(path, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (active) {
          setSales(Array.isArray(data?.items) ? data.items : [])
          const nextTotal = Number(data?.total || 0)
          const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
          setTotalResults(nextTotal)
          if (currentPage > nextTotalPages) {
            setCurrentPage(nextTotalPages)
          }
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }

        setSales([])
        setTotalResults(0)
        setError(formatApiFetchError(loadError, "No se pudieron cargar las ventas"))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [currentPage, dateFrom, dateTo, search, status])

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const totals = useMemo(() => {
    const confirmed = sales.filter((item) => item.status === "confirmed")
    const revenue = confirmed.reduce((acc, item) => acc + Number(item.total_amount || 0), 0)
    const pending = sales.filter((item) => item.status === "draft").length
    return {
      count: totalResults,
      revenue,
      pending,
    }
  }, [sales, totalResults])

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "all" || Boolean(dateFrom) || Boolean(dateTo)
  const firstVisible = sales.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
  const lastVisible = sales.length === 0 ? 0 : firstVisible + sales.length - 1

  function clearFilters() {
    setSearch("")
    setStatus("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  return (
    <PermissionGuard permission="sales.pos">
      <TooltipProvider delayDuration={120}>
        <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-[1180px] space-y-4">
            <PosHeader
              eyebrow="Operacion comercial"
              title="Historial de ventas"
              actions={
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href="/postventa">Postventa</Link>
                </Button>
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <OpsMetricPill label="Ventas visibles" value={totals.count} />
              <OpsMetricPill label="Ingreso visible" value={`S/. ${totals.revenue.toFixed(2)}`} tone="accent" />
              <OpsMetricPill label="Borradores" value={totals.pending} tone="warning" />
            </div>

            <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
              <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_0.84fr_0.84fr_auto] lg:items-end">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Buscar
                  </label>
                  <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                    <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Buscar por nro. venta o cliente"
                      className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                    />
                  </div>
                </div>

                <FilterDropdown
                  label="Estado"
                  value={status}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "draft", label: SALE_STATUS_META.draft.label },
                    { value: "confirmed", label: "Confirmadas" },
                    { value: "cancelled", label: "Canceladas" },
                  ]}
                  onChange={(value) => {
                    setStatus(value)
                    setCurrentPage(1)
                  }}
                />

                <DateFilterPicker
                  label="Fecha desde"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setCurrentPage(1)
                  }}
                  ariaLabel="Fecha desde"
                  max={dateTo || undefined}
                />

                <DateFilterPicker
                  label="Fecha hasta"
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value)
                    setCurrentPage(1)
                  }}
                  ariaLabel="Fecha hasta"
                  min={dateFrom || undefined}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 rounded-lg"
                      aria-label="Limpiar filtros"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    Limpiar filtros
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[980px] border-y border-[var(--ops-border-strong)]">
                  <table className="w-full border-collapse">
                    <thead className="bg-[var(--ops-surface-muted)]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        <th className="px-4 py-3">Venta</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Vendedor</th>
                        <th className="px-4 py-3">Sede</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                            Cargando ventas...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6">
                            <InlineStatusCard
                              title="No pudimos cargar el historial"
                              description={error}
                              tone="danger"
                            />
                          </td>
                        </tr>
                      ) : sales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10">
                            <OpsEmptyState variant="compact" description="No se encontraron ventas con los filtros aplicados." />
                          </td>
                        </tr>
                      ) : (
                        sales.map((sale) => (
                          <tr
                            key={sale.sale_id}
                            className="transition hover:bg-[var(--ops-surface-muted)]"
                          >
                            <td className="px-4 py-[var(--ops-row-py)]">
                              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                {sale.sale_number || "Sin correlativo"}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {sale.document_type}
                              </p>
                            </td>

                            <td className="px-4 py-[var(--ops-row-py)] text-xs leading-5 text-[var(--ops-text-muted)]">
                              {formatDateTime(sale.confirmed_at, sale.created_at)}
                            </td>

                            <td className="px-4 py-[var(--ops-row-py)]">
                              <p className="text-sm font-medium leading-5 text-[var(--ops-text)]">
                                {sale.customer_name_text || "Cliente general"}
                              </p>
                            </td>

                            <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">{sale.seller_name}</td>

                            <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">{sale.location_name}</td>

                            <td className="px-4 py-[var(--ops-row-py)]">
                              <OpsStatusBadge tone={(STATUS_TONES[sale.status] || "neutral") as "success" | "warning" | "danger" | "neutral" | "accent"}>
                                {STATUS_LABELS[sale.status] || sale.status}
                              </OpsStatusBadge>
                            </td>

                            <td className="px-4 py-[var(--ops-row-py)]">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                {formatCurrency(Number(sale.total_amount))}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                                {sale.currency}
                              </p>
                            </td>

                            <td className="px-4 py-[var(--ops-row-py)]">
                              <div className="flex items-center justify-end gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg px-3"
                                    >
                                      <Link href={buildSaleDetailRoute(sale.sale_id)} aria-label="Ver venta">
                                        Ver venta
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={8}>
                                    Ver venta
                                  </TooltipContent>
                                </Tooltip>
                                {sale.status === "confirmed" ? (
                                  <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                                    <Link href={`/postventa/${sale.sale_id}`}>Postventa</Link>
                                  </Button>
                                ) : (
                                  <span className="inline-block h-7 w-[5.25rem]" aria-hidden="true" />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {totalResults === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${totalResults}`}
                </span>

                <Pagination
                  page={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="self-end md:self-auto"
                />
              </div>
            </div>
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
