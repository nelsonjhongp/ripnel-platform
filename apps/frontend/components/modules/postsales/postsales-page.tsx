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
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ui/ops-data-table"
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
import { formatApiFetchError, apiFetch } from "@/lib/api";
import { usePagination } from "@/hooks/use-pagination"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"
import { type PostsaleAvailability } from "@/types/postsales"

type EligibleSale = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  total_amount: number
  currency: string
  seller_name: string
  location_name: string
  confirmed_at: string | null
  created_at: string
  business_date: string
  cash_status: "open" | "closed" | "missing"
  confirmed_exchange_count: number
  availability: PostsaleAvailability
}

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

const COLUMNS: OpsDataTableColumn[] = [
  { key: "sale", header: "Venta" },
  { key: "date", header: "Fecha" },
  { key: "customer", header: "Cliente" },
  { key: "location", header: "Sede" },
  { key: "status", header: "Estado" },
  { key: "total", header: "Total" },
  { key: "postsale", header: "Postventa" },
  { key: "actions", header: "", className: "text-right" },
]

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
          <Button asChild variant="outline" size="icon-sm" className="rounded-lg" aria-label="Ver detalle">
            <Link href={`/postventa/${saleId}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Ver detalle
        </TooltipContent>
      </Tooltip>

      {canOpenSale ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="outline" size="icon-sm" className="rounded-lg" aria-label="Ver venta">
              <Link href={buildSaleDetailRoute(saleId)}>
                <ReceiptText className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Ver venta
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
        <Link href={`/postventa/${saleId}`}>Abrir</Link>
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

    const timeoutWrapper = Promise.resolve().then(() => {
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

          if (active) {
            setSales(Array.isArray(data) ? data : [])
          }
        } catch (loadError) {
          if (!active || controller.signal.aborted) {
            return
          }

          setSales([])
          setError(formatApiFetchError(loadError, "No se pudo cargar la cola operativa de postventa."))
        } finally {
          if (active) {
            setLoading(false)
          }
        }
      }, 250)

      return timeoutId
    })

    return () => {
      active = false
      controller.abort()
      timeoutWrapper.then((id) => {
        if (typeof id === "number") window.clearTimeout(id)
      })
    }
  }, [dateFrom, dateTo, search, status])

  const stats = useMemo(() => {
    const exchangeReady = sales.filter((sale) => sale.availability.exchange.allowed).length
    const cancelReady = sales.filter((sale) => sale.availability.cancel.allowed).length
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
        <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-[1180px] space-y-4">
            <PosHeader
              eyebrow="Postventa"
              title="Postventa controlada"
              actions={
                <>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={appRoutes.transactionHistory}>Historial</Link>
                  </Button>
                  {has("sales.pos") ? (
                    <Button asChild variant="accent" size="sm" className="rounded-lg">
                      <Link href={appRoutes.purchaseSystem}>Nueva venta</Link>
                    </Button>
                  ) : null}
                </>
              }
            />

            <OpsMetricInlineGroup items={[
              { label: "Evaluadas", value: stats.count },
              { label: "Cambio habilitado", value: stats.exchangeReady, tone: "accent" },
              { label: "Anulación habilitada", value: stats.cancelReady, tone: "warning" },
            ]} />

            <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
              <OpsFiltersRow className="lg:grid-cols-[1.45fr_0.84fr_0.84fr_0.84fr_auto]">
                <OpsSearchField
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setPage(1)
                  }}
                  placeholder="Buscar por nro. venta o cliente"
                  ariaLabel="Buscar ventas elegibles"
                />

                <OpsSelect
                  label="Estado"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(value) => {
                    setStatus(value)
                    setPage(1)
                  }}
                />

                <DateFilterPicker
                  label="Fecha desde"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setPage(1)
                  }}
                  ariaLabel="Fecha desde"
                  max={dateTo || undefined}
                />

                <DateFilterPicker
                  label="Fecha hasta"
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value)
                    setPage(1)
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
                columns={COLUMNS}
                minWidth="1080px"
                loading={loading}
                loadingMessage="Cargando ventas elegibles..."
                error={error}
                errorTitle="No pudimos cargar la cola de postventa"
                emptyMessage="No se encontraron ventas para los filtros aplicados."
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
                    <span className="text-sm text-[var(--ops-text-muted)]">0 resultados</span>
                  )
                }
              >
                {paginatedSales.map((sale) => (
                  <tr key={sale.sale_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                        {sale.sale_number || "Sin correlativo"}
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
                        {sale.customer_name_text || "Cliente general"}
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
                          tone={
                            sale.availability.exchange.allowed
                              ? "success"
                              : "neutral"
                          }
                        >
                          {sale.availability.exchange.allowed ? "Cambio ok" : "Cambio bloqueado"}
                        </OpsStatusBadge>
                        <OpsStatusBadge
                          tone={
                            sale.availability.cancel.allowed
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {sale.availability.cancel.allowed ? "Anulación ok" : "Anulación bloqueada"}
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
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
