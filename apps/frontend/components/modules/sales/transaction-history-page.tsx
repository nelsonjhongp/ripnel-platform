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
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsPageShell, OpsSearchField, OpsTableBlock, OpsFiltersRow } from "@/components/ui/ops-page-shell"
import { formatDateTime } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/format-utils"
import { apiFetch } from "@/lib/api"
import { buildSaleDetailRoute, appRoutes } from "@/lib/routes"
import { useApiGet } from "@/hooks/use-api-get"
import { useDebounce } from "@/hooks/use-debounce"
import { SALE_STATUS_META, SALE_STATUS_TONES, type SalesPageResponse } from "@/types/sales"
import { SH } from "./sales-history-messages"
import { PAGE_SIZE, SH_TABLE_COLUMNS } from "./sales-history-constants"

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, loading, error } = useApiGet<SalesPageResponse>(
    (signal) => {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim())
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String((currentPage - 1) * PAGE_SIZE))
      const path = `/api/sales?${params.toString()}`
      return apiFetch<SalesPageResponse>(path, { cache: "no-store", signal })
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
    return { revenue, pending }
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
              eyebrow={SH.header.eyebrow}
              title={SH.header.title}
            />

            <OpsMetricInlineGroup
              items={[
                {
                  icon: <Banknote className="h-4 w-4" />,
                  label: SH.kpis.revenue,
                  value: `S/. ${totals.revenue.toFixed(2)}`,
                  tone: "accent",
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  label: SH.kpis.drafts,
                  value: totals.pending,
                  tone: "warning",
                },
              ]}
            />

            <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
              <OpsFiltersRow className="lg:grid-cols-[minmax(0,1fr)_0.85fr_0.95fr_0.95fr_auto]">
                <OpsSearchField
                  label={SH.filters.searchLabel}
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setCurrentPage(1)
                  }}
                  placeholder={SH.filters.searchPlaceholder}
                  ariaLabel={SH.filters.searchAria}
                  density="compact"
                />

                <OpsSelect
                  label={SH.filters.statusLabel}
                  value={status}
                  options={[
                    { value: "all", label: SH.filters.statusAll },
                    { value: "draft", label: SALE_STATUS_META.draft.label },
                    { value: "confirmed", label: SALE_STATUS_META.confirmed.label },
                    { value: "cancelled", label: SALE_STATUS_META.cancelled.label },
                  ]}
                  onChange={(value) => {
                    setStatus(value)
                    setCurrentPage(1)
                  }}
                />

                <DateFilterPicker
                  label={SH.filters.dateFrom}
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setCurrentPage(1)
                  }}
                  ariaLabel={SH.filters.dateFromAria}
                  max={dateTo || undefined}
                  density="compact"
                />

                <DateFilterPicker
                  label={SH.filters.dateTo}
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value)
                    setCurrentPage(1)
                  }}
                  ariaLabel={SH.filters.dateToAria}
                  min={dateFrom || undefined}
                  density="compact"
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 rounded-lg"
                      aria-label={SH.filters.clear}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {SH.filters.clear}
                  </TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsDataTable
                columns={SH_TABLE_COLUMNS}
                minWidth="980px"
                loading={loading}
                error={error}
                errorTitle={SH.table.error}
                emptyMessage={SH.table.empty}
                isEmpty={sales.length === 0}
                footer={
                  totalResults > 0 ? (
                    <>
                      <span className="text-sm text-[var(--ops-text-muted)]">
                        {firstVisible}-{lastVisible} de {totalResults}
                      </span>
                      <Pagination
                        page={safeCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        className="self-end md:self-auto"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-[var(--ops-text-muted)]">{SH.table.zero}</span>
                  )
                }
              >
                {sales.map((sale) => (
                  <tr
                    key={sale.sale_id}
                    className="transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {sale.sale_number || SH.table.noCorrelative}
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
                        {sale.customer_name_text || SH.table.genericCustomer}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">{sale.seller_name}</td>

                    <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">{sale.location_name}</td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <OpsStatusBadge tone={(SALE_STATUS_TONES[sale.status] || "neutral") as "success" | "warning" | "danger" | "neutral" | "accent"}>
                        {SALE_STATUS_META[sale.status]?.label || sale.status}
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
                              <Link href={buildSaleDetailRoute(sale.sale_id)} aria-label={SH.actions.viewSale}>
                                {SH.actions.viewSale}
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            {SH.actions.viewSale}
                          </TooltipContent>
                        </Tooltip>
                        {sale.status === "confirmed" ? (
                          <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                            <Link href={`/postventa/${sale.sale_id}`}>{SH.actions.postsale}</Link>
                          </Button>
                        ) : sale.status === "draft" ? (
                          <Button asChild variant="warning" size="sm" className="rounded-lg px-3">
                            <Link href={appRoutes.purchaseSystem}>{SH.actions.continueSale}</Link>
                          </Button>
                        ) : (
                          <span className="inline-block h-7 w-[5.25rem]" aria-hidden="true" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            </OpsTableBlock>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  )
}
