"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FilterX,
  Filter,
  Search,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ApiError, apiFetch } from "@/lib/api"

type SaleStatus = "confirmed" | "draft" | "cancelled"

type SaleItem = {
  sale_id: string
  sale_number: string | null
  status: SaleStatus
  document_type: string
  customer_name_text: string | null
  subtotal_amount: number
  tax_amount: number
  sale_discount_amount: number
  total_amount: number
  currency: string
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
}

type SalesPageResponse = {
  items: SaleItem[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "draft", label: "Borradores" },
  { value: "cancelled", label: "Anuladas" },
]

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  draft: "Borrador",
  cancelled: "Anulada",
}

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "sales-chip sales-chip-success",
  draft: "sales-chip sales-chip-warning",
  cancelled: "sales-chip sales-chip-danger",
}

function explainSalesError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudieron cargar las ventas"
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso al historial de ventas."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para consultar el historial operativo."
  }

  return error.message || "No se pudieron cargar las ventas"
}

function formatDateTime(value: string | null, fallback: string) {
  const source = value || fallback
  return new Date(source).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string | number
  tone?: "default" | "success" | "warning"
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      : tone === "warning"
        ? "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300"
        : "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)]"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border px-[var(--ops-metric-px)] py-[var(--ops-metric-py)] shadow-sm",
        toneClass
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-lg font-semibold leading-none">{value}</span>
    </div>
  )
}

export default function TransactionHistoryPage() {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dateFromRef = useRef<HTMLInputElement | null>(null)
  const dateToRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [dateFrom, dateTo, search, status])

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
          setTotalResults(Number(data?.total || 0))
          setHasMore(Boolean(data?.has_more))
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }

        setSales([])
        setTotalResults(0)
        setHasMore(false)
        setError(explainSalesError(loadError))
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

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage)
    }
  }, [currentPage, safeCurrentPage])

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

  function openNativeDatePicker(input: HTMLInputElement | null) {
    if (!input) return

    if (typeof input.showPicker === "function") {
      input.showPicker()
      return
    }

    input.focus()
    input.click()
  }

  return (
    <PermissionGuard permission="sales.pos">
      <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Operacion comercial"
            title="Historial de ventas"
            actions={
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/postventa">Postventa</Link>
              </Button>
            }
          />

          <div className="flex flex-wrap justify-center gap-2">
            <MetricPill label="Ventas visibles" value={totals.count} />
            <MetricPill label="Ingreso visible" value={`S/. ${totals.revenue.toFixed(2)}`} tone="success" />
            <MetricPill label="Borradores" value={totals.pending} tone="warning" />
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            <div className="grid gap-2.5 lg:grid-cols-[1.35fr_0.78fr_0.88fr_0.88fr_auto] lg:items-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nro. venta o cliente"
                  className="sales-field h-10 w-full rounded-lg py-2 pl-9 pr-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Estado
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="sales-field flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <Filter className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <span className="flex-1">{STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Todos"}</span>
                      <ChevronDown className="h-4 w-4 text-[var(--ops-text-muted)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={8}
                    className="min-w-[var(--radix-dropdown-menu-trigger-width)] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text)]"
                  >
                    <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                      {STATUS_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                          className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Fecha desde
                </label>
                <div
                  className="sales-field flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]"
                  onClick={() => openNativeDatePicker(dateFromRef.current)}
                >
                  <CalendarRange className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <input
                    ref={dateFromRef}
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full cursor-pointer bg-transparent text-sm text-[var(--ops-text)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Fecha hasta
                </label>
                <div
                  className="sales-field flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]"
                  onClick={() => openNativeDatePicker(dateToRef.current)}
                >
                  <CalendarRange className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <input
                    ref={dateToRef}
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full cursor-pointer bg-transparent text-sm text-[var(--ops-text)] outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                variant="outline"
                size="sm"
                className="h-10 rounded-lg px-4"
              >
                <FilterX className="h-4 w-4" />
                Limpiar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px] border-y border-[var(--ops-border-strong)]">
                <div className="sales-panel-muted grid grid-cols-[1fr_0.9fr_1fr_0.85fr_0.9fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  <span>Venta</span>
                  <span>Fecha</span>
                  <span>Cliente</span>
                  <span>Vendedor</span>
                  <span>Sede</span>
                  <span>Estado</span>
                  <span>Total</span>
                  <span>Acciones</span>
                </div>

                <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      Cargando ventas...
                    </div>
                  ) : error ? (
                    <div className="px-4 py-6">
                      <InlineStatusCard
                        title="No pudimos cargar el historial"
                        description={error}
                        tone="danger"
                      />
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      No se encontraron ventas con los filtros aplicados.
                    </div>
                  ) : (
                    sales.map((sale) => (
                      <div
                        key={sale.sale_id}
                        className="grid grid-cols-[1fr_0.9fr_1fr_0.85fr_0.9fr_0.8fr_0.8fr_0.9fr] gap-[var(--ops-row-gap)] px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]"
                      >
                        <div>
                          <p className="font-semibold text-[var(--ops-text)]">
                            {sale.sale_number || "Sin correlativo"}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                            {sale.document_type}
                          </p>
                        </div>

                        <div className="text-sm text-[var(--ops-text)]">
                          {formatDateTime(sale.confirmed_at, sale.created_at)}
                        </div>

                        <div>
                          <p className="text-sm font-medium leading-5 text-[var(--ops-text)]">
                            {sale.customer_name_text || "Cliente general"}
                          </p>
                        </div>

                        <div className="text-sm text-[var(--ops-text)]">{sale.seller_name}</div>

                        <div className="text-sm text-[var(--ops-text)]">{sale.location_name}</div>

                        <div>
                          <span
                            className={`${STATUS_CLASSES[sale.status] || "sales-chip"} rounded-full px-2.5 py-1 text-xs font-semibold`}
                          >
                            {STATUS_LABELS[sale.status] || sale.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            S/. {Number(sale.total_amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-[var(--ops-text-muted)]">{sale.currency}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm" className="rounded-full">
                            <Link href={`/purchase-system/${sale.sale_id}`}>Ver venta</Link>
                          </Button>
                          {sale.status === "confirmed" ? (
                            <Button asChild variant="accent" size="sm" className="rounded-full">
                              <Link href={`/postventa/${sale.sale_id}`}>Postventa</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                {totalResults === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${totalResults}`}
              </span>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center text-sm font-medium text-[var(--ops-text)]">
                  {safeCurrentPage}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={!hasMore}
                  className="rounded-lg"
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
