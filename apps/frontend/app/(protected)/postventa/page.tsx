"use client"

import Link from "next/link"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  Eye,
  Filter,
  LayoutGrid,
  List,
  ReceiptText,
  RotateCcw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { Pagination } from "@/components/ui/pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError, apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type PostsaleAvailability = {
  exchange: {
    allowed: boolean
    reasons: string[]
  }
  cancel: {
    allowed: boolean
    reasons: string[]
  }
}

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

type ViewMode = "table" | "cards"

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled", label: "Anuladas" },
  { value: "draft", label: "Borradores" },
]

const STATUS_STYLES: Record<string, string> = {
  confirmed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
  draft:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  cancelled: "Anulada",
  draft: "Borrador",
}

const STATUS_SHORT_LABELS: Record<string, string> = {
  confirmed: "Conf.",
  cancelled: "Anul.",
  draft: "Borr.",
}

const CASH_STYLES: Record<string, string> = {
  open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  closed: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
  missing: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
}

const CASH_LABELS: Record<string, string> = {
  open: "Caja abierta",
  closed: "Caja cerrada",
  missing: "Sin caja",
}

const CASH_SHORT_LABELS: Record<string, string> = {
  open: "Caja ok",
  closed: "Caja cerr.",
  missing: "Sin caja",
}

function explainPostsaleError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudo cargar la cola operativa de postventa."
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso a este módulo de postventa."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para operar postventa."
  }

  return error.message || "No se pudo cargar la cola operativa de postventa."
}

function formatDateLabel(value: string | null, fallback: string) {
  return new Date(value || fallback).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function buildPostsaleSummary(sale: EligibleSale) {
  const exchangeLabel = sale.availability.exchange.allowed ? "Cambio ok" : "Cambio bloq."
  const cancelLabel = sale.availability.cancel.allowed ? "Anulación ok" : "Anulación bloq."
  return `${exchangeLabel} · ${cancelLabel}`
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "emerald" | "sky"
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      : tone === "sky"
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

function IconStatusBadge({
  label,
  shortLabel,
  toneClass,
  icon,
}: {
  label: string
  shortLabel: string
  toneClass: string
  icon: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",
            toneClass
          )}
        >
          {icon}
          <span>{shortLabel}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function SaleActions({
  saleId,
  canOpenSale,
}: {
  saleId: string
  canOpenSale: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/postventa/${saleId}`}
            className="sales-field sales-field-interactive inline-flex h-9 w-9 items-center justify-center rounded-lg"
            aria-label="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Ver detalle
        </TooltipContent>
      </Tooltip>

      {canOpenSale ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/purchase-system/${saleId}`}
              className="sales-field sales-field-interactive inline-flex h-9 w-9 items-center justify-center rounded-lg"
              aria-label="Ver venta"
            >
              <ReceiptText className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Ver venta
          </TooltipContent>
        </Tooltip>
      ) : null}

      <Link
        href={`/postventa/${saleId}`}
        className="inline-flex items-center justify-center rounded-lg bg-[var(--ripnel-accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
      >
        Abrir
      </Link>
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
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    // defer scheduling the load to avoid synchronous setState inside effect
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
          setError(explainPostsaleError(loadError))
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

  useEffect(() => {
    setCurrentPage(1)
  }, [search, status, dateFrom, dateTo])

  const stats = useMemo(() => {
    const exchangeReady = sales.filter((sale) => sale.availability.exchange.allowed).length
    const cancelReady = sales.filter((sale) => sale.availability.cancel.allowed).length
    return {
      count: sales.length,
      exchangeReady,
      cancelReady,
    }
  }, [sales])

  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSales = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return sales.slice(start, start + PAGE_SIZE)
  }, [safeCurrentPage, sales])

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "confirmed" || Boolean(dateFrom) || Boolean(dateTo)

  function clearFilters() {
    setSearch("")
    setStatus("confirmed")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  return (
    <PermissionGuard permission="sales.postsale.view">
      <TooltipProvider delayDuration={120}>
        <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-7xl space-y-[var(--ops-stack-gap)]">
            <PosHeader
              eyebrow="Postventa"
              title="Postventa controlada"
              actions={
                <>
                  <Link
                    href="/transaction-history"
                    className="sales-field sales-field-interactive inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Historial
                  </Link>
                  {has("sales.pos") ? (
                    <Link
                      href="/purchase-system"
                      className="inline-flex items-center justify-center rounded-lg bg-[var(--ripnel-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
                    >
                      Nueva venta
                    </Link>
                  ) : null}
                </>
              }
            />

            <div className="flex flex-wrap gap-2">
              <MetricPill label="Evaluadas" value={stats.count} />
              <MetricPill label="Cambio" value={stats.exchangeReady} tone="emerald" />
              <MetricPill label="Anulación" value={stats.cancelReady} tone="sky" />
            </div>

            <article className="sales-panel rounded-lg p-[var(--ops-panel-padding)] shadow-sm">
              <div className="flex flex-col gap-[var(--ops-stack-gap)]">
                <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_auto] lg:items-end">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por nro. venta o cliente"
                        className="sales-field h-11 w-full rounded-lg py-2.5 pl-9 pr-3 text-sm"
                        aria-label="Buscar ventas"
                      />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Estado
                    </label>
                    <div className="sales-field flex h-11 items-center gap-2 rounded-lg px-3">
                      <Filter className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="w-full bg-transparent text-sm text-[var(--ops-text)] outline-none"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Fecha desde
                    </label>
                    <div className="sales-field flex h-11 items-center gap-2 rounded-lg px-3">
                      <CalendarRange className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="w-full bg-transparent text-sm text-[var(--ops-text)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Fecha hasta
                    </label>
                    <div className="sales-field flex h-11 items-center gap-2 rounded-lg px-3">
                      <CalendarRange className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="w-full bg-transparent text-sm text-[var(--ops-text)] outline-none"
                      />
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className="sales-field sales-field-interactive inline-flex h-11 w-11 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Limpiar filtros"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>Limpiar filtros</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-3 md:flex-row md:items-center md:justify-between">
                  <div className="sales-field inline-flex w-fit rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        viewMode === "table"
                          ? "bg-[var(--ops-surface)] text-[var(--ops-text)] shadow-sm"
                          : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                      }`}
                    >
                      <List className="h-4 w-4" />
                      Tabla
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        viewMode === "cards"
                          ? "bg-[var(--ops-surface)] text-[var(--ops-text)] shadow-sm"
                          : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Tarjetas
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                      {sales.length === 0
                        ? "0 resultados"
                        : `${(safeCurrentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                            safeCurrentPage * PAGE_SIZE,
                            sales.length
                          )} de ${sales.length}`}
                    </span>
                    <Pagination
                      page={safeCurrentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="ops-surface-muted rounded-2xl border px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                    Cargando ventas elegibles...
                  </div>
                ) : error ? (
                  <InlineStatusCard
                    title="No pudimos cargar la cola de postventa"
                    description={error}
                    tone="danger"
                  />
                ) : sales.length === 0 ? (
                  <div className="ops-surface-muted rounded-2xl border px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                    No se encontraron ventas para los filtros aplicados.
                  </div>
                ) : viewMode === "table" ? (
                  <div className="overflow-hidden rounded-lg border border-[var(--ops-border-strong)]">
                    <div className="sales-panel-muted hidden grid-cols-[1fr_1.15fr_0.95fr_0.95fr_1fr_0.8fr_1.05fr_auto] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)] lg:grid">
                      <span>Venta</span>
                      <span>Cliente</span>
                      <span>Fecha</span>
                      <span>Sede</span>
                      <span>Estado</span>
                      <span>Total</span>
                      <span>Postventa</span>
                      <span className="text-right">Acciones</span>
                    </div>

                    <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {paginatedSales.map((sale) => (
                        <div
                          key={sale.sale_id}
                          className="grid gap-[var(--ops-row-gap)] px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)] lg:grid-cols-[1fr_1.15fr_0.95fr_0.95fr_1fr_0.8fr_1.05fr_auto] lg:items-center"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--ops-text)]">
                              {sale.sale_number || "Sin correlativo"}
                            </p>
                            <span className="sales-chip sales-chip-accent mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              {sale.document_type}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--ops-text)]">
                            {sale.customer_name_text || "Cliente general"}
                          </div>

                          <div className="text-xs text-[var(--ops-text)]">
                            {formatDateLabel(sale.confirmed_at, sale.created_at)}
                          </div>

                          <div className="text-xs text-[var(--ops-text)]">
                            {sale.location_name}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <IconStatusBadge
                              label={STATUS_LABELS[sale.status] || sale.status}
                              shortLabel={STATUS_SHORT_LABELS[sale.status] || sale.status}
                              toneClass={
                                STATUS_STYLES[sale.status] ||
                                "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              }
                              icon={
                                sale.status === "confirmed" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : sale.status === "cancelled" ? (
                                  <XCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <CircleAlert className="h-3.5 w-3.5" />
                                )
                              }
                            />
                            <IconStatusBadge
                              label={CASH_LABELS[sale.cash_status] || CASH_LABELS.missing}
                              shortLabel={CASH_SHORT_LABELS[sale.cash_status] || CASH_LABELS.missing}
                              toneClass={CASH_STYLES[sale.cash_status] || CASH_STYLES.missing}
                              icon={<Wallet className="h-3.5 w-3.5" />}
                            />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              S/. {Number(sale.total_amount || 0).toFixed(2)}
                            </p>
                            <p className="ops-secondary-text text-[var(--ops-text-muted)]">
                              {sale.currency}
                            </p>
                          </div>

                          <div className="text-xs text-[var(--ops-text)]">
                            {buildPostsaleSummary(sale)}
                          </div>

                          <SaleActions saleId={sale.sale_id} canOpenSale={has("sales.pos")} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedSales.map((sale) => (
                      <article
                        key={sale.sale_id}
                        className="ops-surface overflow-hidden rounded-2xl border shadow-sm"
                      >
                        <div className="grid gap-3 px-4 py-[var(--ops-row-py)] lg:grid-cols-[1.5fr_auto] lg:items-center">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                                {sale.sale_number || "Sin correlativo"}
                              </h2>
                              <IconStatusBadge
                                label={STATUS_LABELS[sale.status] || sale.status}
                                shortLabel={STATUS_SHORT_LABELS[sale.status] || sale.status}
                                toneClass={
                                  STATUS_STYLES[sale.status] ||
                                  "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                }
                                icon={
                                  sale.status === "confirmed" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : sale.status === "cancelled" ? (
                                    <XCircle className="h-3.5 w-3.5" />
                                  ) : (
                                    <CircleAlert className="h-3.5 w-3.5" />
                                  )
                                }
                              />
                              <IconStatusBadge
                                label={CASH_LABELS[sale.cash_status] || CASH_LABELS.missing}
                                shortLabel={CASH_SHORT_LABELS[sale.cash_status] || CASH_LABELS.missing}
                                toneClass={CASH_STYLES[sale.cash_status] || CASH_STYLES.missing}
                                icon={<Wallet className="h-3.5 w-3.5" />}
                              />
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ops-text)]">
                              <p>{sale.customer_name_text || "Cliente general"}</p>
                              <p>{sale.location_name}</p>
                              <p>{formatDateLabel(sale.confirmed_at, sale.created_at)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="sales-chip sales-chip-accent rounded-full px-2.5 py-1 text-xs font-medium">
                                {sale.document_type}
                              </span>
                              <span className="sales-chip rounded-full px-2.5 py-1 text-xs font-medium">
                                S/. {Number(sale.total_amount || 0).toFixed(2)}
                              </span>
                              <span className="sales-chip rounded-full px-2.5 py-1 text-xs font-medium">
                                {buildPostsaleSummary(sale)}
                              </span>
                            </div>
                          </div>

                          <SaleActions saleId={sale.sale_id} canOpenSale={has("sales.pos")} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
