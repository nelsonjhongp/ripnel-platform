"use client"

import Link from "next/link"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
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
  InlineStatusCard,
  ProtectedLoadingPage,
} from "@/components/feedback/status-page"
import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { INFO_BOX } from "@/components/ui/ops-control-styles"
import { formatApiFetchError, apiFetch, apiFetchData } from "@/lib/api"
import { buildSaleDetailRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useApiGet } from "@/hooks/use-api-get"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { formatDateTime } from "@/lib/date-utils"
import { type PostsaleAvailability, type SaleLine, type SalePayment } from "@/types/postsales"

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

const sectionClass =
  "rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-[var(--ops-panel-padding)] shadow-sm"
const mutedBlockClass =
  "rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-3"
const inputClass =
  "sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
const textareaClass =
  "sales-field min-h-[108px] w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"

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
  if (status === "open") return "Caja abierta"
  if (status === "closed") return "Caja cerrada"
  return "Sin caja"
}

function computeCandidateTotal(candidate: SellableVariant, line: SaleLine, taxRate: number) {
  const subtotal = round2(Number(candidate.retail_price || 0) * Number(line.quantity || 0))
  const tax = round2(subtotal * Number(taxRate || 0))
  return round2(subtotal + tax)
}

function SectionCard({
  title,
  icon,
  aside,
  children,
  tone = "default",
}: {
  title: string
  icon?: ReactNode
  aside?: ReactNode
  children: ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <article
      className={cn(
        sectionClass,
        tone === "danger" &&
          "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]"
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--ops-text)]">
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </article>
  )
}

export default function PostsaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { has } = useAuth()
  const [saleId, setSaleId] = useState<string | null>(null)
  const { data: context, loading, error, refetch } = useApiGet(
    saleId ? () => apiFetchData<PostsaleContext>(`/api/postsales/${saleId}`) : null,
    [saleId]
  )
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
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

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

  useEffect(() => {
    const firstLine = context?.sale.details?.[0]?.sale_detail_id || ""
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
        setReplacementError(formatApiFetchError(loadError, "No se pudo buscar el reemplazo."))
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
      await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/exchanges`, {
        method: "POST",
        body: JSON.stringify({
          sale_detail_id: selectedSaleDetailId,
          replacement_variant_id: selectedReplacementVariantId,
          reason: exchangeReason,
          notes: exchangeNotes,
        }),
      })

      refetch()
      setActionSuccess("El cambio simple quedó registrado correctamente.")
      setReplacementSearch("")
      setReplacementResults([])
      setSelectedReplacementVariantId("")
      setExchangeReason("")
      setExchangeNotes("")
    } catch (submitError) {
      setActionError(formatApiFetchError(submitError, "La operación no se pudo completar."))
    } finally {
      setExchangeSubmitting(false)
    }
  }

  function initiateCancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!saleId) return
    if (!cancelReason.trim()) return

    setCancelConfirmOpen(true)
  }

  async function executeCancellation() {
    if (!saleId) return

    setActionError(null)
    setActionSuccess(null)
    setCancelSubmitting(true)

    try {
      await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          reason: cancelReason,
          notes: cancelNotes,
        }),
      })

      refetch()
      setActionSuccess("La venta quedó anulada y la trazabilidad interna fue registrada.")
      setCancelReason("")
      setCancelNotes("")
    } catch (submitError) {
      setActionError(formatApiFetchError(submitError, "La operación no se pudo completar."))
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

  if (error || !context) {
    return (
      <ProtectedErrorPage
        title="No pudimos abrir la postventa"
        description={error || "La venta solicitada no está disponible para esta sede."}
      />
    )
  }

  const documentPath = resolveDocumentPath(context)
  const isProforma = context.sale.document_type === "proforma"

  return (
    <PermissionGuard permission="sales.postsale.view">
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Postventa operativa"
            title={context.sale.sale_number || "Sin correlativo"}
            meta={
              <>
                <OpsStatusBadge tone="accent">{context.sale.document_type.toUpperCase()}</OpsStatusBadge>
                <OpsStatusBadge tone={context.sale.cash_status === "open" ? "success" : context.sale.cash_status === "closed" ? "danger" : "warning"}>{cashStatusLabel(context.sale.cash_status)}</OpsStatusBadge>
                <OpsStatusBadge>{`Fecha operativa ${context.sale.business_date}`}</OpsStatusBadge>
              </>
            }
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href="/postventa">
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </Link>
                </Button>
                {has("sales.pos") ? (
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={buildSaleDetailRoute(context.sale.sale_id)}>Ver venta completa</Link>
                  </Button>
                ) : null}
                {documentPath && has("sales.pos") ? (
                  isProforma ? (
                    <Button asChild variant="accent" size="sm" className="rounded-lg">
                      <a href={documentPath} target="_blank" rel="noreferrer">
                        <ReceiptText className="h-4 w-4" />
                        Abrir proforma
                      </a>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setReceiptModalOpen(true)}
                    >
                      <Download className="h-4 w-4" />
                      Descargar comprobante
                    </Button>
                  )
                ) : null}
              </>
            }
          />

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

          <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="space-y-4">
              <SectionCard
                title="Venta base"
                icon={<PackageSearch className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
              >
                <div className="space-y-2.5">
                  {context.sale.details.map((line) => (
                    <label
                      key={line.sale_detail_id}
                      className={cn(
                        "block cursor-pointer rounded-lg border px-3 py-3 transition",
                        selectedSaleDetailId === line.sale_detail_id
                          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))]"
                          : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] hover:bg-[var(--ops-surface)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <input
                            type="radio"
                            name="sale-line"
                            value={line.sale_detail_id}
                            checked={selectedSaleDetailId === line.sale_detail_id}
                            onChange={() => setSelectedSaleDetailId(line.sale_detail_id)}
                            className="mt-0.5 h-4 w-4 accent-[var(--ripnel-accent)]"
                            disabled={!context.availability.exchange.allowed || !has("sales.postsale.exchange")}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                              {line.sku} • {line.size_code} / {line.color_code}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatCurrency(Number(line.line_total))}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-[var(--ops-text-muted)] md:grid-cols-4">
                        <span>Cantidad {line.quantity}</span>
                        <span>Lista {formatCurrency(Number(line.unit_price_list))}</span>
                        <span>Final {formatCurrency(Number(line.unit_price_final))}</span>
                        <span>Subtotal {formatCurrency(Number(line.line_subtotal))}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </SectionCard>

              {context.exchanges.length > 0 ? (
                <SectionCard
                  title="Trazabilidad de cambios"
                  icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
                >
                  <div className="space-y-3">
                    {context.exchanges.map((exchange) => (
                      <div key={exchange.exchange_id} className={mutedBlockClass}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {exchange.exchange_number || exchange.exchange_id}
                            </p>
                            <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                              {exchange.reason || "Sin motivo"} • {formatDateTime(exchange.confirmed_at, exchange.created_at)}
                            </p>
                          </div>
                          <OpsStatusBadge tone="success">{exchange.status}</OpsStatusBadge>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {exchange.lines.map((line) => (
                            <div
                              key={line.exchange_line_id}
                              className={INFO_BOX}
                            >
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                {line.direction === "IN" ? "Ingreso" : "Salida"} • {line.style_name}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                                {line.sku} • {line.size_code} / {line.color_code}
                              </p>
                              <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                                Cantidad {line.quantity} • Ref. {formatCurrency(Number(line.unit_reference_price || 0))}
                              </p>
                            </div>
                          ))}
                        </div>

                        {exchange.notes ? (
                          <p className="mt-3 text-sm text-[var(--ops-text-muted)]">{exchange.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              {context.cancellation ? (
                <SectionCard title="Anulación registrada" tone="danger">
                  <p className="text-sm text-[var(--ops-tone-danger-text)]">
                    {context.cancellation.reason} • {formatDateTime(context.cancellation.cancelled_at)}
                  </p>
                  {context.cancellation.notes ? (
                    <p className="mt-2 text-sm text-[var(--ops-tone-danger-text)]">
                      {context.cancellation.notes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-danger-text)]">
                    Ejecutado por {context.cancellation.cancelled_by_name || "Usuario no identificado"}
                  </p>
                </SectionCard>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionCard
                title="Cliente y operación"
                icon={<User className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
              >
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">Cliente</p>
                    <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                      {context.sale.customer_name_text || "Cliente general"}
                    </p>
                  </div>
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">Documento</p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">
                      {context.sale.customer_doc_type || "-"} {context.sale.customer_doc_number || ""}
                    </p>
                  </div>
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">Sede</p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.location_name}</p>
                  </div>
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">Vendedor</p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.seller_name}</p>
                  </div>
                  <div className={cn(mutedBlockClass, "md:col-span-2")}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">Dirección</p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.customer_address_text || "-"}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Pagos y neutralización"
                icon={<CreditCard className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
              >
                <div className="space-y-2">
                  {(context.sale.payments || []).map((payment) => (
                    <div key={payment.payment_id} className={mutedBlockClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold capitalize text-[var(--ops-text)]">{payment.method}</p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{formatDateTime(payment.paid_at)}</p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                      </div>
                      {payment.reference ? (
                        <p className="mt-2 text-xs text-[var(--ops-text-muted)]">Ref. {payment.reference}</p>
                      ) : null}
                    </div>
                  ))}

                  {context.payment_reversals.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {context.payment_reversals.map((reversal) => (
                        <div
                          key={reversal.payment_reversal_id}
                          className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold capitalize text-[var(--ops-tone-danger-text)]">
                                Reverso {reversal.method}
                              </p>
                              <p className="mt-1 text-xs text-[var(--ops-tone-danger-text)]">
                                {reversal.reason} • {formatDateTime(reversal.reversed_at)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-[var(--ops-tone-danger-text)]">
                              - {formatCurrency(Number(reversal.amount))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 border-t border-[var(--ops-border-strong)] pt-4 text-sm">
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>Pagos registrados</span>
                    <span>{formatCurrency(paymentSummary.paymentTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>Reversos internos</span>
                    <span>{formatCurrency(paymentSummary.reversalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-[var(--ops-text)]">
                    <span>Neto operativo</span>
                    <span>{formatCurrency(paymentSummary.netTotal)}</span>
                  </div>
                </div>
              </SectionCard>

              {has("sales.postsale.exchange") ? (
                <form onSubmit={handleExchangeSubmit} className={sectionClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                    <h2 className="text-lg font-semibold text-[var(--ops-text)]">Cambio simple</h2>
                  </div>

                  {context.availability.exchange.allowed ? (
                    <div className="space-y-4">
                      <OpsFormField
                        label="Buscar reemplazo"
                        error={replacementError}
                        density="compact"
                      >
                        <input
                          type="text"
                          name="postsale_replacement_search"
                          autoComplete="off"
                          value={replacementSearch}
                          onChange={(event) => setReplacementSearch(event.target.value)}
                          placeholder="Busca por SKU, estilo o código"
                          className={inputClass}
                        />
                      </OpsFormField>

                      {selectedLine ? (
                        <div className={mutedBlockClass}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                            Línea base
                          </p>
                          <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                            {selectedLine.style_name} • {selectedLine.quantity} und
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            Total original {formatCurrency(Number(selectedLine.line_total))}
                          </p>
                        </div>
                      ) : null}

                      {replacementLoading ? (
                        <div className={cn(mutedBlockClass, "py-6 text-center text-sm text-[var(--ops-text-muted)]")}>
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
                                className={cn(
                                  "block w-full rounded-lg border px-3 py-3 text-left transition",
                                  selectedReplacementVariantId === variant.variant_id
                                    ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))]"
                                    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] hover:bg-[var(--ops-surface)]"
                                )}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--ops-text)]">{variant.style_name}</p>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                                      {variant.sku} • {variant.size_code} / {variant.color_code}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p className="font-semibold text-[var(--ops-text)]">
                                      {formatCurrency(Number(variant.retail_price || 0))}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                                      Stock {Number(variant.stock || 0)}
                                    </p>
                                  </div>
                                </div>
                                {selectedLine ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <OpsStatusBadge
                                      tone={valueMatches ? "success" : "warning"}
                                    >
                                      {valueMatches
                                        ? "Mismo valor total"
                                        : `Total ${formatCurrency(replacementTotal)}`}
                                    </OpsStatusBadge>
                                  </div>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      ) : replacementSearch.trim().length >= 2 ? (
                        <div className={cn(mutedBlockClass, "py-6 text-center text-sm text-[var(--ops-text-muted)]")}>
                          No encontramos variantes disponibles para ese criterio.
                        </div>
                      ) : null}

                      {selectedReplacement ? (
                        <div className="rounded-lg border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-success-text)]">
                            Reemplazo seleccionado
                          </p>
                          <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                            {selectedReplacement.style_name} • {selectedReplacement.sku}
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            Precio {formatCurrency(Number(selectedReplacement.retail_price || 0))}
                          </p>
                        </div>
                      ) : null}

                      <OpsFormField label="Motivo obligatorio" required density="compact">
                        <input
                          type="text"
                          name="postsale_exchange_reason"
                          autoComplete="off"
                          value={exchangeReason}
                          onChange={(event) => setExchangeReason(event.target.value)}
                          placeholder="Ej. talla no adecuada, color reemplazado"
                          className={inputClass}
                        />
                      </OpsFormField>

                      <OpsFormField label="Notas" density="compact">
                        <textarea
                          name="postsale_exchange_notes"
                          autoComplete="off"
                          value={exchangeNotes}
                          onChange={(event) => setExchangeNotes(event.target.value)}
                          rows={3}
                          className={textareaClass}
                          placeholder="Detalle adicional del cambio"
                        />
                      </OpsFormField>

                      <Button
                        type="submit"
                        variant="accent"
                        size="lg"
                        className="rounded-lg px-4"
                        disabled={
                          exchangeSubmitting ||
                          !selectedSaleDetailId ||
                          !selectedReplacementVariantId ||
                          !exchangeReason.trim()
                        }
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {exchangeSubmitting ? "Registrando cambio..." : "Registrar cambio simple"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {context.availability.exchange.reasons.join(" ")}
                    </p>
                  )}
                </form>
              ) : null}

              {has("sales.postsale.cancel") ? (
                <form onSubmit={initiateCancel} className={sectionClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <Undo2 className="h-4 w-4 text-[var(--ops-text-muted)]" />
                    <h2 className="text-lg font-semibold text-[var(--ops-text)]">Anulación total</h2>
                  </div>

                  {context.availability.cancel.allowed ? (
                    <div className="space-y-4">
                      <OpsFormField label="Motivo obligatorio" required density="compact">
                        <input
                          type="text"
                          name="postsale_cancel_reason"
                          autoComplete="off"
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          placeholder="Ej. venta digitada por error"
                          className={inputClass}
                        />
                      </OpsFormField>

                      <OpsFormField label="Notas" density="compact">
                        <textarea
                          name="postsale_cancel_notes"
                          autoComplete="off"
                          value={cancelNotes}
                          onChange={(event) => setCancelNotes(event.target.value)}
                          rows={3}
                          className={textareaClass}
                          placeholder="Detalle adicional de la anulación"
                        />
                      </OpsFormField>

                      <Button
                        type="submit"
                        variant="accent"
                        size="lg"
                        className="rounded-lg px-4"
                        disabled={cancelSubmitting || !cancelReason.trim()}
                      >
                        <Undo2 className="h-4 w-4" />
                        {cancelSubmitting ? "Anulando venta..." : "Anular venta"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {context.availability.cancel.reasons.join(" ")}
                    </p>
                  )}
                </form>
              ) : null}

              {context.sale.notes ? (
                <SectionCard title="Notas originales">
                  <p className="text-sm text-[var(--ops-text-muted)]">{context.sale.notes}</p>
                </SectionCard>
              ) : null}
            </div>
          </div>
        </div>

        <ReceiptOptionsModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          saleId={context.sale.sale_id}
          onOpenPreview={() => {
            setReceiptModalOpen(false)
          }}
        />

        <OpsDialog
          open={cancelConfirmOpen}
          onOpenChange={setCancelConfirmOpen}
          title="Confirmar anulación"
          description="¿Confirmas que deseas anular esta venta? Esta acción es irreversible."
          size="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setCancelConfirmOpen(false)} className="rounded-lg">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setCancelConfirmOpen(false)
                  executeCancellation()
                }}
                disabled={cancelSubmitting}
                className="rounded-lg"
              >
                {cancelSubmitting ? "Anulando..." : "Anular venta"}
              </Button>
            </div>
          }
        >
          <></>
        </OpsDialog>
      </section>
    </PermissionGuard>
  )
}
