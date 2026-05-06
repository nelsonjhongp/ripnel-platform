"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  PackageSearch,
  ReceiptText,
  RefreshCcw,
  ShieldAlert,
  Undo2,
  User,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ProtectedErrorPage,
  ProtectedForbiddenPage,
  InlineStatusCard,
  ProtectedLoadingPage,
  ProtectedNotFoundPage,
} from "@/components/feedback/status-page"
import { ApiError, apiFetch } from "@/lib/api"

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

type SaleLine = {
  sale_detail_id: string
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  size_name: string
  color_code: string
  color_name: string
  quantity: number
  unit_price_list: number
  unit_price_final: number
  line_subtotal: number
  line_tax: number
  line_total: number
}

type SalePayment = {
  payment_id: string
  method: string
  amount: number
  reference: string | null
  paid_at: string
}

type PaymentReversal = {
  payment_reversal_id: string
  payment_id: string
  method: string
  amount: number
  reason: string
  notes: string | null
  reversed_at: string
  reversed_by_name: string | null
}

type ExchangeLine = {
  exchange_line_id: string
  direction: "IN" | "OUT"
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  color_code: string
  quantity: number
  unit_reference_price: number | null
}

type ExchangeRecord = {
  exchange_id: string
  exchange_number: string | null
  status: string
  reason: string | null
  notes: string | null
  created_by_name: string | null
  confirmed_by_name: string | null
  confirmed_at: string | null
  created_at: string
  lines: ExchangeLine[]
}

type PostsaleContext = {
  sale: {
    sale_id: string
    sale_number: string | null
    status: string
    document_type: string
    customer_name_text: string | null
    customer_doc_type: string | null
    customer_doc_number: string | null
    customer_address_text: string | null
    location_name: string
    seller_name: string
    subtotal_amount: number
    tax_amount: number
    tax_rate: number
    total_amount: number
    currency: string
    notes: string | null
    business_date: string
    confirmed_at: string | null
    created_at: string
    cash_status: "open" | "closed" | "missing"
    details: SaleLine[]
    payments: SalePayment[]
  }
  payment_reversals: PaymentReversal[]
  cancellation: {
    sale_cancellation_id: string
    reason: string
    notes: string | null
    cancelled_at: string
    cancelled_by_name: string | null
  } | null
  exchanges: ExchangeRecord[]
  cash_closing: {
    cash_closing_id: string
    business_date: string
    status: "open" | "closed" | "missing"
  } | null
  availability: PostsaleAvailability
}

type SellableVariant = {
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  size_name: string
  color_code: string
  color_name: string
  stock: number
  retail_price: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value)
}

function round2(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function formatDateTime(value: string | null, fallback?: string | null) {
  const source = value || fallback
  if (!source) return "-"

  return new Date(source).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function explainLoadError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No pudimos cargar el contexto de postventa."
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso a este flujo de postventa."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para operar postventa."
  }

  return error.message || "No pudimos cargar el contexto de postventa."
}

function explainActionError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "La operación no se pudo completar."
  }

  if (error.status === 403) {
    return "Tu rol no tiene permisos para ejecutar esta operación."
  }

  if (error.status === 409 || error.status === 400) {
    return error.message
  }

  return error.message || "La operación no se pudo completar."
}

function resolveDocumentPath(context: PostsaleContext) {
  if (context.sale.document_type === "proforma") {
    return `/api/sales/${context.sale.sale_id}/proforma-pdf`
  }

  if (context.sale.document_type === "boleta" || context.sale.document_type === "factura") {
    return `/api/sales/${context.sale.sale_id}/pdf`
  }

  return null
}

function cashStatusLabel(status: PostsaleContext["sale"]["cash_status"]) {
  if (status === "open") return "Caja operativa abierta"
  if (status === "closed") return "Caja operativa cerrada"
  return "Sin caja operativa abierta"
}

function cashStatusClasses(status: PostsaleContext["sale"]["cash_status"]) {
  if (status === "open") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "closed") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function computeCandidateTotal(candidate: SellableVariant, line: SaleLine, taxRate: number) {
  const subtotal = round2(Number(candidate.retail_price || 0) * Number(line.quantity || 0))
  const tax = round2(subtotal * Number(taxRate || 0))
  return round2(subtotal + tax)
}

export default function PostsaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { has } = useAuth()
  const [saleId, setSaleId] = useState<string | null>(null)
  const [context, setContext] = useState<PostsaleContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedSaleDetailId, setSelectedSaleDetailId] = useState<string>("")
  const [replacementSearch, setReplacementSearch] = useState("")
  const [replacementResults, setReplacementResults] = useState<SellableVariant[]>([])
  const [replacementLoading, setReplacementLoading] = useState(false)
  const [replacementError, setReplacementError] = useState<string | null>(null)
  const [selectedReplacementVariantId, setSelectedReplacementVariantId] = useState<string>("")
  const [exchangeReason, setExchangeReason] = useState("")
  const [exchangeNotes, setExchangeNotes] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNotes, setCancelNotes] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    params.then(({ saleId: resolvedSaleId }) => {
      if (active) {
        setSaleId(resolvedSaleId)
      }
    })

    return () => {
      active = false
    }
  }, [params])

  async function loadContext(targetSaleId: string) {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<PostsaleContext>(`/api/postsales/${targetSaleId}`, {
        cache: "no-store",
      })

      setContext(data)
    } catch (loadError) {
      setContext(null)
      setError(loadError instanceof Error ? loadError : new Error(explainLoadError(loadError)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!saleId) return
    // defer loadContext to avoid synchronous setState inside effect
    void Promise.resolve().then(() => loadContext(saleId))
  }, [saleId])

  useEffect(() => {
    const firstLine = context?.sale.details?.[0]?.sale_detail_id || ""
    // defer setting selection to avoid synchronous setState inside effect
    void Promise.resolve().then(() => {
      if (!selectedSaleDetailId || !context?.sale.details.some((line) => line.sale_detail_id === selectedSaleDetailId)) {
        setSelectedSaleDetailId(firstLine)
      }
    })
  }, [context, selectedSaleDetailId])

  useEffect(() => {
    const canSearchReplacement =
      Boolean(context) &&
      has("sales.postsale.exchange") &&
      context?.availability.exchange.allowed &&
      replacementSearch.trim().length >= 2

    if (!canSearchReplacement) {
      // defer clearing replacement state to avoid synchronous setState inside effect
      void Promise.resolve().then(() => {
        setReplacementResults([])
        setReplacementLoading(false)
        setReplacementError(null)
      })
      return
    }

    const controller = new AbortController()
    let active = true

    const timeoutId = window.setTimeout(async () => {
      setReplacementLoading(true)
      setReplacementError(null)

      try {
        const params = new URLSearchParams({ q: replacementSearch.trim() })
        const data = await apiFetch<SellableVariant[]>(
          `/api/sales/sellable-variants?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        )

        if (active) {
          setReplacementResults(Array.isArray(data) ? data : [])
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }

        setReplacementResults([])
        setReplacementError(explainActionError(loadError))
      } finally {
        if (active) {
          setReplacementLoading(false)
        }
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [context, has, replacementSearch])

  const selectedLine = useMemo(
    () => context?.sale.details.find((line) => line.sale_detail_id === selectedSaleDetailId) || null,
    [context, selectedSaleDetailId]
  )

  const selectedReplacement = useMemo(
    () =>
      replacementResults.find((variant) => variant.variant_id === selectedReplacementVariantId) || null,
    [replacementResults, selectedReplacementVariantId]
  )

  const paymentSummary = useMemo(() => {
    const paymentTotal = round2(
      (context?.sale.payments || []).reduce((acc, payment) => acc + Number(payment.amount || 0), 0)
    )
    const reversalTotal = round2(
      (context?.payment_reversals || []).reduce(
        (acc, reversal) => acc + Number(reversal.amount || 0),
        0
      )
    )

    return {
      paymentTotal,
      reversalTotal,
      netTotal: round2(paymentTotal - reversalTotal),
    }
  }, [context])

  async function handleExchangeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!saleId || !selectedSaleDetailId || !selectedReplacementVariantId) {
      setActionError("Selecciona una línea de venta y una variante de reemplazo.")
      return
    }

    setActionError(null)
    setActionSuccess(null)
    setExchangeSubmitting(true)

    try {
      const updated = await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/exchanges`, {
        method: "POST",
        body: JSON.stringify({
          sale_detail_id: selectedSaleDetailId,
          replacement_variant_id: selectedReplacementVariantId,
          reason: exchangeReason,
          notes: exchangeNotes,
        }),
      })

      setContext(updated)
      setActionSuccess("El cambio simple quedó registrado correctamente.")
      setReplacementSearch("")
      setReplacementResults([])
      setSelectedReplacementVariantId("")
      setExchangeReason("")
      setExchangeNotes("")
    } catch (submitError) {
      setActionError(explainActionError(submitError))
    } finally {
      setExchangeSubmitting(false)
    }
  }

  async function handleCancelSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!saleId) return

    // TODO: Replace window.confirm() with a proper confirmation modal
    if (!window.confirm("¿Confirmas que deseas anular esta venta? Esta acción es irreversible.")) {
      return
    }

    setActionError(null)
    setActionSuccess(null)
    setCancelSubmitting(true)

    try {
      const updated = await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reason: cancelReason,
          notes: cancelNotes,
        }),
      })

      setContext(updated)
      setActionSuccess("La venta quedó anulada y la trazabilidad interna fue registrada.")
      setCancelReason("")
      setCancelNotes("")
    } catch (submitError) {
      setActionError(explainActionError(submitError))
    } finally {
      setCancelSubmitting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedLoadingPage
        title="Cargando contexto de postventa"
        description="Estamos recuperando la venta, sus pagos, caja y trazabilidad interna."
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <ProtectedNotFoundPage />
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ProtectedForbiddenPage />
  }

  if (error || !context) {
    return (
      <ProtectedErrorPage
        title="No pudimos abrir la postventa"
        description={error?.message || "La venta solicitada no está disponible para esta sede."}
      />
    )
  }

  const documentPath = resolveDocumentPath(context)

  return (
    <PermissionGuard permission="sales.postsale.view">
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-7xl space-y-[var(--ops-stack-gap)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/postventa"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a postventa
            </Link>

            <div className="flex flex-wrap gap-2">
              {has("sales.pos") ? (
                <Link
                  href={`/purchase-system/${context.sale.sale_id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Ver venta completa
                </Link>
              ) : null}
              {documentPath && has("sales.pos") ? (
                <a
                  href={documentPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                >
                  <ReceiptText className="h-4 w-4" />
                  Abrir documento
                </a>
              ) : null}
            </div>
          </div>

          <header className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">Postventa operativa</p>
                <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-3xl">
                  {context.sale.sale_number || "Sin correlativo"}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cashStatusClasses(
                    context.sale.cash_status
                  )}`}
                >
                  {cashStatusLabel(context.sale.cash_status)}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Fecha operativa {context.sale.business_date}
                </span>
              </div>
            </div>
          </header>

          {actionSuccess ? (
            <InlineStatusCard
              title="Operación completada"
              description={actionSuccess}
              tone="neutral"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          ) : null}

          {actionError ? (
            <InlineStatusCard
              title="No pudimos completar la operación"
              description={actionError}
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          ) : null}

          {!context.availability.exchange.allowed ? (
            <InlineStatusCard
              title="Cambio simple bloqueado"
              description={context.availability.exchange.reasons.join(" ")}
              tone="warning"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          ) : null}

          {!context.availability.cancel.allowed ? (
            <InlineStatusCard
              title="Anulación bloqueada"
              description={context.availability.cancel.reasons.join(" ")}
              tone="warning"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          ) : null}

          <div className="grid gap-[var(--ops-stack-gap)] xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-[var(--ops-stack-gap)]">
              <article className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <PackageSearch className="h-4 w-4 text-amber-700" />
                  Venta base
                </h2>
                <div className="space-y-3">
                  {context.sale.details.map((line) => (
                    <label
                      key={line.sale_detail_id}
                      className={`block rounded-2xl border px-4 py-3 transition ${
                        selectedSaleDetailId === line.sale_detail_id
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <input
                            type="radio"
                            name="sale-line"
                            value={line.sale_detail_id}
                            checked={selectedSaleDetailId === line.sale_detail_id}
                            onChange={() => setSelectedSaleDetailId(line.sale_detail_id)}
                            className="mt-1 h-4 w-4 accent-amber-600"
                            disabled={!context.availability.exchange.allowed || !has("sales.postsale.exchange")}
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{line.style_name}</p>
                            <p className="text-xs text-slate-500">
                              {line.sku} • {line.size_code} / {line.color_code}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(Number(line.line_total))}
                        </p>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                        <span>Cantidad: {line.quantity}</span>
                        <span>Lista: {formatCurrency(Number(line.unit_price_list))}</span>
                        <span>Final: {formatCurrency(Number(line.unit_price_final))}</span>
                        <span>Subtotal: {formatCurrency(Number(line.line_subtotal))}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </article>

              {context.exchanges.length > 0 ? (
                <article className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <RefreshCcw className="h-4 w-4 text-amber-700" />
                    Trazabilidad de cambios
                  </h2>
                  <div className="space-y-3">
                    {context.exchanges.map((exchange) => (
                      <div
                        key={exchange.exchange_id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {exchange.exchange_number || exchange.exchange_id}
                            </p>
                            <p className="text-sm text-slate-600">
                              {exchange.reason || "Sin motivo"} •{" "}
                              {formatDateTime(exchange.confirmed_at, exchange.created_at)}
                            </p>
                          </div>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {exchange.status}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {exchange.lines.map((line) => (
                            <div
                              key={line.exchange_line_id}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <p className="font-semibold text-slate-900">
                                {line.direction === "IN" ? "Ingreso" : "Salida"} • {line.style_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {line.sku} • {line.size_code} / {line.color_code}
                              </p>
                              <p className="mt-1">
                                Cantidad {line.quantity} • Ref.{" "}
                                {formatCurrency(Number(line.unit_reference_price || 0))}
                              </p>
                            </div>
                          ))}
                        </div>

                        {exchange.notes ? (
                          <p className="mt-3 text-sm text-slate-600">{exchange.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {context.cancellation ? (
                <article className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5 shadow-sm">
                  <h2 className="mb-2 text-lg font-semibold text-rose-900">Anulación registrada</h2>
                  <p className="text-sm text-rose-900/80">
                    {context.cancellation.reason} •{" "}
                    {formatDateTime(context.cancellation.cancelled_at)}
                  </p>
                  {context.cancellation.notes ? (
                    <p className="mt-2 text-sm text-rose-900/80">{context.cancellation.notes}</p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-wide text-rose-700">
                    Ejecutado por {context.cancellation.cancelled_by_name || "Usuario no identificado"}
                  </p>
                </article>
              ) : null}
            </div>

            <div className="space-y-[var(--ops-stack-gap)]">
              <article className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <User className="h-4 w-4 text-amber-700" />
                  Cliente y operación
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium">Cliente:</span>{" "}
                    {context.sale.customer_name_text || "Cliente general"}
                  </p>
                  <p>
                    <span className="font-medium">Documento:</span>{" "}
                    {context.sale.customer_doc_type || "-"} {context.sale.customer_doc_number || ""}
                  </p>
                  <p>
                    <span className="font-medium">Dirección:</span>{" "}
                    {context.sale.customer_address_text || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Sede:</span> {context.sale.location_name}
                  </p>
                  <p>
                    <span className="font-medium">Vendedor:</span> {context.sale.seller_name}
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <CreditCard className="h-4 w-4 text-amber-700" />
                  Pagos y neutralización
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  {(context.sale.payments || []).map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="font-medium capitalize text-slate-800">{payment.method}</p>
                      <p>Monto: {formatCurrency(Number(payment.amount))}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(payment.paid_at)}</p>
                    </div>
                  ))}

                  {context.payment_reversals.length > 0 ? (
                    <div className="space-y-2 pt-2">
                      {context.payment_reversals.map((reversal) => (
                        <div
                          key={reversal.payment_reversal_id}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2"
                        >
                          <p className="font-medium capitalize text-rose-900">
                            Reverso {reversal.method}
                          </p>
                          <p className="text-rose-900/80">
                            - {formatCurrency(Number(reversal.amount))}
                          </p>
                          <p className="text-xs text-rose-700">
                            {reversal.reason} • {formatDateTime(reversal.reversed_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Pagos registrados</span>
                    <span>{formatCurrency(paymentSummary.paymentTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Reversos internos</span>
                    <span>{formatCurrency(paymentSummary.reversalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Neto operativo</span>
                    <span>{formatCurrency(paymentSummary.netTotal)}</span>
                  </div>
                </div>
              </article>

              {has("sales.postsale.exchange") ? (
                <form
                  onSubmit={handleExchangeSubmit}
                  className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur"
                >
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <RefreshCcw className="h-4 w-4 text-amber-700" />
                    Cambio simple
                  </h2>

                  {context.availability.exchange.allowed ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Buscar reemplazo
                        </label>
                        <input
                          type="text"
                          value={replacementSearch}
                          onChange={(event) => setReplacementSearch(event.target.value)}
                          placeholder="Busca por SKU, estilo o código"
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                        />
                        {replacementError ? (
                          <p className="mt-2 text-sm text-rose-600">{replacementError}</p>
                        ) : null}
                      </div>

                      {selectedLine ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">Línea base seleccionada</p>
                          <p className="mt-1">
                            {selectedLine.style_name} • {selectedLine.quantity} und • Total original{" "}
                            {formatCurrency(Number(selectedLine.line_total))}
                          </p>
                        </div>
                      ) : null}

                      {replacementLoading ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                          Buscando variantes disponibles...
                        </div>
                      ) : replacementResults.length > 0 ? (
                        <div className="space-y-2">
                          {replacementResults.map((variant) => {
                            const replacementTotal =
                              selectedLine
                                ? computeCandidateTotal(variant, selectedLine, context.sale.tax_rate)
                                : 0
                            const valueMatches =
                              selectedLine ? round2(replacementTotal) === round2(selectedLine.line_total) : true

                            return (
                              <button
                                key={variant.variant_id}
                                type="button"
                                onClick={() => setSelectedReplacementVariantId(variant.variant_id)}
                                className={`block w-full rounded-2xl border px-3 py-3 text-left transition ${
                                  selectedReplacementVariantId === variant.variant_id
                                    ? "border-amber-300 bg-amber-50"
                                    : "border-slate-200 bg-slate-50 hover:bg-white"
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">{variant.style_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {variant.sku} • {variant.size_code} / {variant.color_code}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p className="font-semibold text-slate-900">
                                      {formatCurrency(Number(variant.retail_price || 0))}
                                    </p>
                                    <p className="text-slate-500">Stock {Number(variant.stock || 0)}</p>
                                  </div>
                                </div>
                                {selectedLine ? (
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span
                                      className={`rounded-full border px-2.5 py-1 font-semibold ${
                                        valueMatches
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-rose-200 bg-rose-50 text-rose-700"
                                      }`}
                                    >
                                      {valueMatches
                                        ? "Mismo valor total"
                                        : `Total resultante ${formatCurrency(replacementTotal)}`}
                                    </span>
                                  </div>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      ) : replacementSearch.trim().length >= 2 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                          No encontramos variantes disponibles para ese criterio.
                        </div>
                      ) : null}

                      {selectedReplacement ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                          <p className="font-semibold">Reemplazo seleccionado</p>
                          <p className="mt-1">
                            {selectedReplacement.style_name} • {selectedReplacement.sku} • Precio{" "}
                            {formatCurrency(Number(selectedReplacement.retail_price || 0))}
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Motivo obligatorio
                        </label>
                        <input
                          type="text"
                          value={exchangeReason}
                          onChange={(event) => setExchangeReason(event.target.value)}
                          placeholder="Ej. talla no adecuada, color reemplazado"
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Notas
                        </label>
                        <textarea
                          value={exchangeNotes}
                          onChange={(event) => setExchangeNotes(event.target.value)}
                          rows={3}
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                          placeholder="Detalle adicional del cambio"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={
                          exchangeSubmitting ||
                          !selectedSaleDetailId ||
                          !selectedReplacementVariantId ||
                          !exchangeReason.trim()
                        }
                        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {exchangeSubmitting ? "Registrando cambio..." : "Registrar cambio simple"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {context.availability.exchange.reasons.join(" ")}
                    </p>
                  )}
                </form>
              ) : null}

              {has("sales.postsale.cancel") ? (
                <form
                  onSubmit={handleCancelSubmit}
                  className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur"
                >
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Undo2 className="h-4 w-4 text-[var(--ops-text-muted)]" />
                    Anulación total
                  </h2>

                  {context.availability.cancel.allowed ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Motivo obligatorio
                        </label>
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          placeholder="Ej. venta digitada por error"
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Notas
                        </label>
                        <textarea
                          value={cancelNotes}
                          onChange={(event) => setCancelNotes(event.target.value)}
                          rows={3}
                          className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                          placeholder="Detalle adicional de la anulación"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={cancelSubmitting || !cancelReason.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Undo2 className="h-4 w-4" />
                        {cancelSubmitting ? "Anulando venta..." : "Anular venta"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {context.availability.cancel.reasons.join(" ")}
                    </p>
                  )}
                </form>
              ) : null}

              {context.sale.notes ? (
                <article className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--ops-panel-padding)] shadow-sm backdrop-blur">
                  <h2 className="mb-2 text-lg font-semibold text-slate-800">Notas originales</h2>
                  <p className="text-sm text-slate-600">{context.sale.notes}</p>
                </article>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
