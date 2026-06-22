"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  ReceiptText,
  RotateCcw,
  Wallet,
  XCircle,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsPageShell, OpsSearchField, OpsTableBlock, OpsFiltersRow } from "@/components/ui/ops-page-shell"
import { Pagination } from "@/components/ui/pagination"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { usePagination } from "@/hooks/use-pagination"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"
import type { EligibleSale } from "@/types/postsales"
import { PS } from "./postsales-messages"
import { PS_TABLE_COLUMNS } from "./postsales-constants"

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled", label: "Anuladas" },
  { value: "draft", label: "Borradores" },
] as const

const STATUS_TONES: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  confirmed: "success",
  cancelled: "danger",
  draft: "warning",
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  cancelled: "Anulada",
  draft: "Borrador",
}

const CASH_TONES: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  open: "success",
  closed: "danger",
  missing: "warning",
}

const CASH_LABELS: Record<string, string> = {
  open: "Caja abierta",
  closed: "Caja cerrada",
  missing: "Sin caja",
}

function formatDateLabel(value: string | null, fallback: string) {
  return new Date(value || fallback).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function SaleActions({
  saleId,
  canOpenSale,
}: {
  saleId: string
  canOpenSale: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="outline" size="icon-sm" className="rounded-lg" aria-label={PS.actions.viewDetail}>
            <Link href={`/postventa/${saleId}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {PS.actions.viewDetail}
        </TooltipContent>
      </Tooltip>

      {canOpenSale ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon-sm" className="rounded-lg" aria-label={PS.actions.viewSale}>
              <Link href={buildSaleDetailRoute(saleId)}>
                <ReceiptText className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            {PS.actions.viewSale}
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
        <Link href={`/postventa/${saleId}`}>{PS.actions.open}</Link>
      </Button>
    </div>
  )
}

export default function PostsalePage() {
  const { has } = useAuth()
  const [sales, setSales] = useState<EligibleSale[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("confirmed")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
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
        if (search.trim()) params.set("q", search.trim())
        if (status !== "all") params.set("status", status)
        if (dateFrom) params.set("date_from", dateFrom)
        if (dateTo) params.set("date_to", dateTo)

        const path = params.toString()
          ? `/api/postsales/eligible?${params.toString()}`
          : "/api/postsales/eligible"

        const data = await apiFetch<EligibleSale[]>(path, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (active) setSales(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (!active || controller.signal.aborted) return
        setSales([])
        setError(explainApiError(loadError, PS.table.error))
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [dateFrom, dateTo, search, status])

  const stats = useMemo(() => {
    const exchangeReady = sales.filter((s) => s.availability.exchange.allowed).length
    const cancelReady = sales.filter((s) => s.availability.cancel.allowed).length
    return {
      count: sales.length,
      exchangeReady,
      cancelReady,
    }
  }, [sales])

  const { paginatedItems: paginatedSales, totalPages, safePage, firstVisible, lastVisible, setPage } = usePagination(sales)

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "confirmed" || Boolean(dateFrom) || Boolean(dateTo)

  function clearFilters() {
    setSearch("")
    setStatus("confirmed")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  return (
    <PermissionGuard permission="sales.postsale.view">
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide">
            <PosHeader
              eyebrow={PS.header.eyebrow}
              title={PS.header.title}
              actions={
                <>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={appRoutes.transactionHistory}>{PS.actions.history}</Link>
                  </Button>
                  {has("sales.pos") ? (
                    <Button asChild variant="accent" size="sm" className="rounded-lg">
                      <Link href={appRoutes.purchaseSystem}>{PS.actions.newSale}</Link>
                    </Button>
                  ) : null}
                </>
              }
            />

            <OpsMetricInlineGroup items={[
              { label: PS.kpis.evaluated, value: stats.count },
              { label: PS.kpis.exchangeReady, value: stats.exchangeReady, tone: "accent" },
              { label: PS.kpis.cancelReady, value: stats.cancelReady, tone: "warning" },
            ]} />

            <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
              <OpsFiltersRow className="lg:grid-cols-[minmax(0,1fr)_0.85fr_0.95fr_0.95fr_auto]">
                <OpsSearchField
                  label={PS.filters.searchLabel}
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setPage(1)
                  }}
                  placeholder={PS.filters.searchPlaceholder}
                  ariaLabel={PS.filters.searchAria}
                  density="compact"
                />

                <OpsSelect
                  label={PS.filters.statusLabel}
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(value) => {
                    setStatus(value)
                    setPage(1)
                  }}
                />

                <DateFilterPicker
                  label={PS.filters.dateFrom}
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setPage(1)
                  }}
                  ariaLabel={PS.filters.dateFromAria}
                  max={dateTo || undefined}
                  density="compact"
                />

                <DateFilterPicker
                  label={PS.filters.dateTo}
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value)
                    setPage(1)
                  }}
                  ariaLabel={PS.filters.dateToAria}
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
                      aria-label={PS.filters.clear}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {PS.filters.clear}
                  </TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsDataTable
                columns={PS_TABLE_COLUMNS}
                minWidth="1080px"
                loading={loading}
                loadingMessage={PS.table.loading}
                error={error}
                errorTitle={PS.table.error}
                emptyMessage={PS.table.empty}
                isEmpty={paginatedSales.length === 0}
                footer={
                  sales.length > 0 ? (
                    <>
                      <span className="text-sm text-[var(--ops-text-muted)]">
                        {firstVisible}-{lastVisible} de {sales.length}
                      </span>
                      <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        className="self-end md:self-auto"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-[var(--ops-text-muted)]">{PS.table.zero}</span>
                  )
                }
              >
                {paginatedSales.map((sale) => (
                  <tr key={sale.sale_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {sale.sale_number || PS.table.noCorrelative}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {sale.document_type}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-xs leading-5 text-[var(--ops-text-muted)]">
                      <p>{formatDateLabel(sale.confirmed_at, sale.created_at)}</p>
                      <p className="mt-1 uppercase tracking-[0.12em]">{sale.business_date}</p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="text-sm font-medium leading-5 text-[var(--ops-text)]">
                        {sale.customer_name_text || PS.table.genericCustomer}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                        {sale.seller_name}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                      {sale.location_name}
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <div className="flex flex-wrap gap-1.5">
                        <OpsStatusBadge
                          tone={STATUS_TONES[sale.status] || "neutral"}
                          icon={
                            sale.status === "confirmed" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : sale.status === "cancelled" ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CircleAlert className="h-3.5 w-3.5" />
                            )
                          }
                        >
                          {STATUS_LABELS[sale.status] || sale.status}
                        </OpsStatusBadge>
                        <OpsStatusBadge
                          tone={CASH_TONES[sale.cash_status] || "neutral"}
                          icon={<Wallet className="h-3.5 w-3.5" />}
                        >
                          {CASH_LABELS[sale.cash_status] || CASH_LABELS.missing}
                        </OpsStatusBadge>
                      </div>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        S/. {Number(sale.total_amount || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                        {sale.currency}
                      </p>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <div className="flex flex-wrap gap-1.5">
                        <OpsStatusBadge
                          tone={sale.availability.exchange.allowed ? "success" : "neutral"}
                        >
                          {sale.availability.exchange.allowed ? "Cambio ok" : "Cambio bloqueado"}
                        </OpsStatusBadge>
                        <OpsStatusBadge
                          tone={sale.availability.cancel.allowed ? "warning" : "neutral"}
                        >
                          {sale.availability.cancel.allowed ? "Anulacion ok" : "Anulacion bloqueada"}
                        </OpsStatusBadge>
                      </div>
                    </td>

                    <td className="px-4 py-[var(--ops-row-py)]">
                      <SaleActions saleId={sale.sale_id} canOpenSale={has("sales.pos")} />
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
