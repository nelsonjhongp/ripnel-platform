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
import { InlineStatusCard } from "@/components/feedback/status-page"
import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
import { OpsSearchField } from "@/components/ui/ops-page-shell"
import { Pagination } from "@/components/ui/pagination"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
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

            <div className="flex flex-wrap items-center gap-2">
              <OpsMetricPill label="Evaluadas" value={stats.count} />
              <OpsMetricPill label="Cambio habilitado" value={stats.exchangeReady} tone="accent" />
              <OpsMetricPill label="Anulación habilitada" value={stats.cancelReady} tone="warning" />
            </div>

            <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
              <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_0.84fr_0.84fr_auto] lg:items-end">
                <OpsSearchField
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setPage(1)
                  }}
                  placeholder="Buscar por nro. venta o cliente"
                  ariaLabel="Buscar ventas elegibles"
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
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1080px] border-y border-[var(--ops-border-strong)]">
                  <table className="w-full border-collapse">
                    <thead className="bg-[var(--ops-surface-muted)]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        <th className="px-4 py-3">Venta</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Sede</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Postventa</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                            Cargando ventas elegibles...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6">
                            <InlineStatusCard
                              title="No pudimos cargar la cola de postventa"
                              description={error}
                              tone="danger"
                            />
                          </td>
                        </tr>
                      ) : paginatedSales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10">
                            <OpsEmptyState variant="compact" description="No se encontraron ventas para los filtros aplicados." />
                          </td>
                        </tr>
                      ) : (
                        paginatedSales.map((sale) => (
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {sales.length === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${sales.length}`}
                </span>

                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
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
