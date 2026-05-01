"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { ApiError, apiFetch, buildApiUrl } from "@/lib/api"

type SaleStatus = "confirmed" | "draft" | "cancelled"

type SaleItem = {
  sale_id: string
  sale_number: string | null
  location_id: string
  seller_user_id: string
  status: SaleStatus
  document_type: string
  customer_name_text: string | null
  customer_doc_number: string | null
  subtotal_amount: number
  tax_amount: number
  sale_discount_amount: number
  total_amount: number
  currency: string
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
  cash_closing_id: string | null
  cash_closing_status: "open" | "closed" | null
  sales_receipt_id: string | null
  receipt_sunat_status: string | null
  receipt_sunat_code: string | null
  receipt_sunat_message: string | null
  receipt_queue_status: string | null
}

type RetryPendingResult = {
  skipped: boolean
  reason?: string
  processed: number
  failed: number
}

type SalesPagination = {
  mode?: "page" | "cursor"
  cursor?: string | null
  next_cursor?: string | null
  page: number
  page_size: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

type SalesListResponse = {
  items: SaleItem[]
  pagination: SalesPagination
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "draft", label: "Borradores" },
  { value: "cancelled", label: "Anuladas" },
]

const DOCUMENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "boleta", label: "Boleta" },
  { value: "factura", label: "Factura" },
  { value: "proforma", label: "Proforma" },
  { value: "none", label: "Sin comprobante" },
]

const CASH_STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abierta" },
  { value: "closed", label: "Cerrada" },
  { value: "missing", label: "Sin caja" },
]

const RECEIPT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Pendientes" },
  { value: "missing", label: "Sin emitir" },
  { value: "pending", label: "En proceso" },
  { value: "error", label: "Error" },
  { value: "accepted", label: "Aceptado" },
  { value: "rejected", label: "Rechazado" },
]

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  draft: "Borrador",
  cancelled: "Anulada",
}

const RECEIPT_STYLES: Record<string, string> = {
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  missing: "border-slate-200 bg-slate-100 text-slate-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-700",
  not_applicable: "border-slate-200 bg-slate-100 text-slate-500",
}

const RECEIPT_LABELS: Record<string, string> = {
  accepted: "Aceptado",
  pending: "Pendiente",
  error: "Error",
  rejected: "Rechazado",
  missing: "Sin emitir",
  unknown: "Sin estado",
  not_applicable: "No aplica",
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

function isReceiptDocument(documentType: string) {
  return documentType === "boleta" || documentType === "factura"
}

function formatDocumentType(documentType: string) {
  if (documentType === "boleta") return "Boleta"
  if (documentType === "factura") return "Factura"
  if (documentType === "proforma") return "Proforma"
  if (documentType === "none") return "Sin comprobante"
  return documentType
}

function resolveReceiptStatus(sale: SaleItem) {
  if (!isReceiptDocument(sale.document_type)) {
    return "not_applicable"
  }

  if (sale.receipt_queue_status) {
    return sale.receipt_queue_status
  }

  if (!sale.sales_receipt_id) {
    return "missing"
  }

  return sale.receipt_sunat_status || "unknown"
}

function shouldShowRetryAction(sale: SaleItem) {
  if (sale.status !== "confirmed") return false
  if (!isReceiptDocument(sale.document_type)) return false

  const status = resolveReceiptStatus(sale)
  return ["missing", "pending", "error", "open", "unknown"].includes(status)
}

function formatRetryPendingMessage(result: RetryPendingResult) {
  if (result.skipped) {
    if (result.reason === "already-running") {
      return "Ya hay un proceso de reintentos en curso."
    }

    if (result.reason === "apisunat-disabled") {
      return "APISUNAT esta deshabilitado en el backend."
    }

    return "No se ejecutaron reintentos pendientes."
  }

  return `Reintento masivo completado: ${result.processed} procesadas, ${result.failed} con fallo.`
}

export default function TransactionHistoryPage() {
  const { has } = useAuth()

  const [sales, setSales] = useState<SaleItem[]>([])
  const [saleNumber, setSaleNumber] = useState("")
  const [customerQuery, setCustomerQuery] = useState("")
  const [userQuery, setUserQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [documentType, setDocumentType] = useState("all")
  const [cashStatus, setCashStatus] = useState("all")
  const [receiptStatus, setReceiptStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [pageSize, setPageSize] = useState(25)
  const [pagination, setPagination] = useState<SalesPagination>({
    mode: "cursor",
    cursor: null,
    next_cursor: null,
    page: 1,
    page_size: 25,
    total_count: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingSaleId, setRetryingSaleId] = useState<string | null>(null)
  const [retryingPending, setRetryingPending] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const canRetrySale = has("sales.pos")
  const canRetryPending = has("admin.manage")

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (status !== "all") params.set("status", status)
        if (documentType !== "all") params.set("document_type", documentType)
        if (cashStatus !== "all") params.set("cash_status", cashStatus)
        if (receiptStatus !== "all") params.set("receipt_status", receiptStatus)
        if (saleNumber.trim()) params.set("q", saleNumber.trim())
        if (customerQuery.trim()) params.set("customer_q", customerQuery.trim())
        if (userQuery.trim()) params.set("user_q", userQuery.trim())
        if (dateFrom) params.set("date_from", dateFrom)
        if (dateTo) params.set("date_to", dateTo)
        if (cursor) params.set("cursor", cursor)
        params.set("page_size", String(pageSize))

        const path = params.toString() ? `/api/sales?${params.toString()}` : "/api/sales"
        const data = await apiFetch<SalesListResponse | SaleItem[]>(path, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (active) {
          if (Array.isArray(data)) {
            setSales(data)
            setPagination({
              mode: "page",
              cursor,
              next_cursor: null,
              page: cursorHistory.length + 1,
              page_size: pageSize,
              total_count: data.length,
              total_pages: 1,
              has_next: false,
              has_prev: cursorHistory.length > 0,
            })
          } else {
            setSales(Array.isArray(data.items) ? data.items : [])
            setPagination(
              data.pagination || {
                mode: "cursor",
                cursor,
                next_cursor: null,
                page: cursorHistory.length + 1,
                page_size: pageSize,
                total_count: Array.isArray(data.items) ? data.items.length : 0,
                total_pages: 1,
                has_next: false,
                has_prev: cursorHistory.length > 0,
              }
            )
          }
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }

        setSales([])
        setPagination({
          mode: "cursor",
          cursor,
          next_cursor: null,
          page: cursorHistory.length + 1,
          page_size: pageSize,
          total_count: 0,
          total_pages: 1,
          has_next: false,
          has_prev: cursorHistory.length > 0,
        })
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
  }, [
    cashStatus,
    customerQuery,
    dateFrom,
    dateTo,
    documentType,
    receiptStatus,
    reloadTick,
    saleNumber,
    cursor,
    cursorHistory.length,
    pageSize,
    status,
    userQuery,
  ])

  useEffect(() => {
    setCursor(null)
    setCursorHistory([])
  }, [cashStatus, customerQuery, dateFrom, dateTo, documentType, receiptStatus, saleNumber, status, userQuery])

  const totals = useMemo(() => {
    const confirmed = sales.filter((item) => item.status === "confirmed")
    const revenue = confirmed.reduce((acc, item) => acc + Number(item.total_amount || 0), 0)
    const pendingReceipt = sales.filter((item) => {
      const receipt = resolveReceiptStatus(item)
      return ["missing", "pending", "error", "open", "unknown"].includes(receipt)
    }).length
    const visibleCount =
      typeof pagination.total_count === "number" && pagination.total_count > 0
        ? pagination.total_count
        : sales.length
    return { count: visibleCount, revenue, pendingReceipt }
  }, [pagination.total_count, sales])

  const hasActiveFilters =
    Boolean(saleNumber.trim()) ||
    Boolean(customerQuery.trim()) ||
    Boolean(userQuery.trim()) ||
    status !== "all" ||
    documentType !== "all" ||
    cashStatus !== "all" ||
    receiptStatus !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo)

  function clearFilters() {
    setSaleNumber("")
    setCustomerQuery("")
    setUserQuery("")
    setStatus("all")
    setDocumentType("all")
    setCashStatus("all")
    setReceiptStatus("all")
    setDateFrom("")
    setDateTo("")
    setCursor(null)
    setCursorHistory([])
  }

  function goNextCursor() {
    if (!pagination.next_cursor) {
      return
    }

    setCursorHistory((current) => [...current, cursor || ""])
    setCursor(pagination.next_cursor)
  }

  function goPrevCursor() {
    setCursorHistory((current) => {
      if (current.length === 0) {
        return current
      }

      const next = [...current]
      const previousCursor = next.pop() || ""
      setCursor(previousCursor || null)
      return next
    })
  }

  async function retrySaleReceipt(saleId: string) {
    setRetryingSaleId(saleId)
    setActionMessage(null)

    try {
      await apiFetch(`/api/sales/${saleId}/retry-receipt`, {
        method: "POST",
      })
      setActionMessage("Se ejecuto el reintento de emision para la venta seleccionada.")
      setReloadTick((value) => value + 1)
    } catch (retryError) {
      setActionMessage(
        retryError instanceof ApiError
          ? retryError.message || "No se pudo reintentar la emision del comprobante."
          : "No se pudo reintentar la emision del comprobante."
      )
    } finally {
      setRetryingSaleId(null)
    }
  }

  async function retryPendingReceipts() {
    setRetryingPending(true)
    setActionMessage(null)

    try {
      const result = await apiFetch<RetryPendingResult>("/api/sales/receipts/retry-pending", {
        method: "POST",
        body: JSON.stringify({ limit: 30 }),
      })

      setActionMessage(formatRetryPendingMessage(result))
      setReloadTick((value) => value + 1)
    } catch (retryError) {
      setActionMessage(
        retryError instanceof ApiError
          ? retryError.message || "No se pudo reintentar la cola de comprobantes."
          : "No se pudo reintentar la cola de comprobantes."
      )
    } finally {
      setRetryingPending(false)
    }
  }

  return (
    <PermissionGuard permission="sales.pos">
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-violet-600">Operaciones de venta</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Historial de ventas</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Consulta ventas reales por cliente, usuario, caja y tipo de comprobante; abre el
                  detalle completo y controla la emision fiscal desde la misma pantalla.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/postventa"
                  className="inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
                >
                  Postventa
                </Link>
                <Link
                  href="/purchase-system"
                  className="inline-flex items-center justify-center rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
                >
                  Nueva venta
                </Link>
                {canRetryPending ? (
                  <button
                    type="button"
                    onClick={retryPendingReceipts}
                    disabled={retryingPending}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {retryingPending ? "Reintentando..." : "Reintentar pendientes"}
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ventas visibles</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totals.count}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Ingreso confirmado</p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">S/. {totals.revenue.toFixed(2)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-amber-700">Comprobantes pendientes</p>
              <p className="mt-2 text-2xl font-bold text-amber-800">{totals.pendingReceipt}</p>
            </article>
          </div>

          {actionMessage ? (
            <InlineStatusCard title="Accion de comprobantes" description={actionMessage} tone="neutral" />
          ) : null}

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={saleNumber}
                  onChange={(event) => setSaleNumber(event.target.value)}
                  placeholder="Nro. venta"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Cliente o doc"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Usuario vendedor"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
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
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <ReceiptText className="h-4 w-4 text-slate-500" />
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={cashStatus}
                    onChange={(event) => setCashStatus(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {CASH_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <ReceiptText className="h-4 w-4 text-slate-500" />
                  <select
                    value={receiptStatus}
                    onChange={(event) => setReceiptStatus(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {RECEIPT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <CalendarRange className="h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <CalendarRange className="h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar filtros
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr_0.9fr_0.7fr_1.1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Venta</span>
                <span>Fecha</span>
                <span>Cliente</span>
                <span>Usuario</span>
                <span>Caja</span>
                <span>Estado</span>
                <span>Comprobante</span>
                <span>Total</span>
                <span>Acciones</span>
              </div>

              <div className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">Cargando ventas...</div>
                ) : error ? (
                  <div className="px-4 py-6">
                    <InlineStatusCard
                      title="No pudimos cargar el historial"
                      description={error}
                      tone="danger"
                    />
                  </div>
                ) : sales.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No se encontraron ventas con los filtros aplicados.
                  </div>
                ) : (
                  sales.map((sale) => {
                    const receipt = resolveReceiptStatus(sale)
                    const showRetry = canRetrySale && shouldShowRetryAction(sale)

                    return (
                      <div
                        key={sale.sale_id}
                        className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1fr_0.9fr_1fr_0.9fr_0.8fr_0.8fr_0.9fr_0.7fr_1.1fr] lg:items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{sale.sale_number || "Sin correlativo"}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-violet-600">
                            {formatDocumentType(sale.document_type)}
                          </p>
                        </div>

                        <div className="text-sm text-slate-700">
                          {formatDateTime(sale.confirmed_at, sale.created_at)}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {sale.customer_name_text || "Cliente general"}
                          </p>
                          <p className="text-xs text-slate-500">{sale.customer_doc_number || "Sin doc"}</p>
                        </div>

                        <div className="text-sm text-slate-700">{sale.seller_name}</div>

                        <div>
                          <p className="text-sm text-slate-700">
                            {sale.cash_closing_status === "open"
                              ? "Abierta"
                              : sale.cash_closing_status === "closed"
                                ? "Cerrada"
                                : "Sin caja"}
                          </p>
                          <p className="text-xs text-slate-500">{sale.location_name}</p>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              STATUS_STYLES[sale.status] || "border-slate-200 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {STATUS_LABELS[sale.status] || sale.status}
                          </span>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              RECEIPT_STYLES[receipt] || "border-slate-200 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {RECEIPT_LABELS[receipt] || receipt}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            S/. {Number(sale.total_amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">{sale.currency}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/purchase-system/${sale.sale_id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver detalle
                          </Link>

                          {sale.status === "confirmed" && isReceiptDocument(sale.document_type) ? (
                            <a
                              href={buildApiUrl(`/api/sales/${sale.sale_id}/pdf`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              PDF
                            </a>
                          ) : sale.status === "confirmed" && sale.document_type === "proforma" ? (
                            <a
                              href={buildApiUrl(`/api/sales/${sale.sale_id}/proforma-pdf`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              PDF Proforma
                            </a>
                          ) : null}

                          {showRetry ? (
                            <button
                              type="button"
                              onClick={() => retrySaleReceipt(sale.sale_id)}
                              disabled={retryingSaleId === sale.sale_id}
                              className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {retryingSaleId === sale.sale_id ? "Reintentando..." : "Reemitir"}
                            </button>
                          ) : null}

                          {sale.status === "confirmed" ? (
                            <Link
                              href={`/postventa/${sale.sale_id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800"
                            >
                              Postventa
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Pagina {cursorHistory.length + 1}
                {typeof pagination.total_count === "number" && pagination.total_count > 0
                  ? ` • ${pagination.total_count} venta(s)`
                  : " • navegacion por cursor"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filas
                </label>
                <select
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) || 25)
                    setCursor(null)
                    setCursorHistory([])
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                >
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <button
                  type="button"
                  onClick={goPrevCursor}
                  disabled={loading || cursorHistory.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={goNextCursor}
                  disabled={loading || !pagination.has_next || !pagination.next_cursor}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </article>

          <div className="rounded-3xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-800 shadow-sm">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4" />
              <p>
                El detalle de cada venta muestra lineas, pagos, cliente y estado del comprobante;
                los reintentos de emision se ejecutan segun permisos vigentes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
