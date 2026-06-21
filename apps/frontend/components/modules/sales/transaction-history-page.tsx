"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { RotateCcw, Banknote, Clock } from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"

import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { OpsSelect } from "@/components/ui/ops-selection"
import { Pagination } from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { formatDateTime } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/format-utils"
import { apiFetch } from "@/lib/api"
import { buildSaleDetailRoute } from "@/lib/routes"
import { useApiGet } from "@/hooks/use-api-get"
import { useDebounce } from "@/hooks/use-debounce"
import { SALE_STATUS_META, SALE_STATUS_TONES, type SalesPageResponse } from "@/types/sales"


const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  confirmed: SALE_STATUS_META.confirmed.label,
  draft: SALE_STATUS_META.draft.label,
  cancelled: SALE_STATUS_META.cancelled.label,
}

const STATUS_TONES: Record<string, string> = SALE_STATUS_TONES

const COLUMNS: OpsDataTableColumn[] = [
  { key: "sale", header: "Venta" },
  { key: "date", header: "Fecha" },
  { key: "customer", header: "Cliente" },
  { key: "seller", header: "Vendedor" },
  { key: "location", header: "Sede" },
  { key: "status", header: "Estado" },
  { key: "total", header: "Total" },
  { key: "actions", header: "", className: "text-right" },
]

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, loading, error } = useApiGet<SalesPageResponse>(
    () => {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim())
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String((currentPage - 1) * PAGE_SIZE))
      const path = `/api/sales?${params.toString()}`
      return apiFetch<SalesPageResponse>(path, { cache: "no-store" })
    },
    [currentPage, dateFrom, dateTo, debouncedSearch, status]
  )

  const sales = Array.isArray(data?.items) ? data.items : []
  const totalResults = Number(data?.total || 0)
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const totals = useMemo(() => {
    const confirmed = sales.filter((item) => item.status === "confirmed")
    const revenue = confirmed.reduce((acc, item) => acc + Number(item.total_amount || 0), 0)
    const pending = sales.filter((item) => item.status === "draft").length
    return {
      revenue,
      pending,
    }
  }, [sales])

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
        <OpsPageShell width="wide">
          <PosHeader
              eyebrow="Operacion comercial"
              title="Historial de ventas"
            />

            <OpsMetricInlineGroup
              items={[
                {
                  icon: <Banknote className="h-4 w-4" />,
                  label: "Ingreso",
                  value: `S/. ${totals.revenue.toFixed(2)}`,
                  tone: "accent",
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  label: "Borradores",
                  value: totals.pending,
                  tone: "warning",
                },
              ]}
            />

            <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
              <OpsFiltersRow className="lg:grid-cols-[1.45fr_0.84fr_0.84fr_0.84fr_auto]">
                <OpsSearchField
                  label="Buscar"
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setCurrentPage(1)
                  }}
                  placeholder="Buscar por nro. venta o cliente"
                  ariaLabel="Buscar ventas por numero o cliente"
                />

                <OpsSelect
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
                  label="Desde"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setCurrentPage(1)
                  }}
                  ariaLabel="Fecha desde"
                  max={dateTo || undefined}
                />

                <DateFilterPicker
                  label="Hasta"
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
              </OpsFiltersRow>

              <OpsDataTable
                columns={[
                  { key: "venta", header: "Venta" },
                  { key: "fecha", header: "Fecha" },
                  { key: "cliente", header: "Cliente" },
                  { key: "vendedor", header: "Vendedor" },
                  { key: "sede", header: "Sede" },
                  { key: "estado", header: "Estado" },
                  { key: "total", header: "Total" },
                  { key: "acciones", header: "Acciones", className: "text-right" },
                ]}
                minWidth="980px"
                loading={loading}
                loadingMessage="Cargando ventas..."
                error={error}
                errorTitle="No pudimos cargar el historial"
                emptyMessage="No se encontraron ventas con los filtros aplicados."
                isEmpty={!loading && !error && sales.length === 0}
                footer={
                  <>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {totalResults === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${totalResults}`}
                    </span>
                    <Pagination
                      page={safeCurrentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      className="self-end md:self-auto"
                    />
                  </>
                }
              >
                {sales.map((sale) => (
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
                        ) : sale.status === "draft" ? (
                          <Button asChild variant="outline" size="sm" className="rounded-lg border-[color:color-mix(in_srgb,#f59e0b_40%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-3 text-[color:color-mix(in_srgb,#d97706_82%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#f59e0b_18%,var(--ops-surface))]">
                            <Link href={`/ventas/${sale.sale_id}`}>CONTINUAR VENTA</Link>
                          </Button>
                        ) : (
                          <span className="inline-block h-7 w-[5.25rem]" aria-hidden="true" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            </div>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  )
}
