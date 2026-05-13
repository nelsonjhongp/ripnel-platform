"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CreditCard, ReceiptText, RotateCcw, User } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ProtectedErrorPage,
  ProtectedForbiddenPage,
  InlineStatusCard,
  ProtectedLoadingPage,
  ProtectedNotFoundPage,
} from "@/components/feedback/status-page"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { ApiError, apiFetch } from "@/lib/api"
import { appRoutes } from "@/lib/routes"

type SaleDetail = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  customer_doc_type: string | null
  customer_doc_number: string | null
  customer_address_text: string | null
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  notes: string | null
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
  details: Array<{
    sale_detail_id: string
    variant_id: string
    sku: string
    style_name: string
    style_code: string
    size_code: string
    color_code: string
    quantity: number
    unit_price_list: number
    unit_price_final: number
    line_subtotal: number
    line_tax: number
    line_total: number
  }>
  payments: Array<{
    payment_id: string
    method: string
    amount: number
    reference: string | null
    paid_at: string
  }>
  receipt: {
    sales_receipt_id: string
    sunat_status: string | null
    sunat_code: string | null
    sunat_message: string | null
    pdf_url: string | null
    issued_at: string | null
  } | null
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

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function isCloseEnough(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

function resolveSaleDocumentPath(sale: SaleDetail) {
  if (sale.document_type === "proforma") {
    return `/api/sales/${sale.sale_id}/proforma-pdf`
  }

  if (sale.document_type === "boleta" || sale.document_type === "factura") {
    return `/api/sales/${sale.sale_id}/pdf`
  }

  return null
}

function isReceiptDocument(documentType: string) {
  return documentType === "boleta" || documentType === "factura"
}

function resolveReceiptStatus(sale: SaleDetail) {
  if (!isReceiptDocument(sale.document_type)) {
    return "not_applicable"
  }

  if (!sale.receipt) {
    return "missing"
  }

  return sale.receipt.sunat_status || "unknown"
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { has } = useAuth()
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [retryingReceipt, setRetryingReceipt] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadSale() {
      setLoading(true)
      setError(null)

      try {
        const { saleId } = await params
        const data = await apiFetch<SaleDetail>(`/api/sales/${saleId}`, {
          cache: "no-store",
        })

        if (active) {
          setSale(data)
        }
      } catch (loadError) {
        if (active) {
          setSale(null)
          setError(loadError instanceof Error ? loadError : new Error("No se pudo cargar la venta"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSale()

    return () => {
      active = false
    }
  }, [params])

  const consistency = useMemo(() => {
    if (!sale) {
      return null
    }

    const lineSubtotal = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_subtotal || 0), 0)
    )
    const lineTax = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_tax || 0), 0)
    )
    const lineTotal = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_total || 0), 0)
    )
    const paymentTotal = round2(
      sale.payments.reduce((accumulator, payment) => accumulator + Number(payment.amount || 0), 0)
    )

    const headerMatches =
      isCloseEnough(lineSubtotal, Number(sale.subtotal_amount || 0)) &&
      isCloseEnough(lineTax, Number(sale.tax_amount || 0)) &&
      isCloseEnough(lineTotal, Number(sale.total_amount || 0))
    const paymentMatches = isCloseEnough(paymentTotal, Number(sale.total_amount || 0))

    return {
      lineSubtotal,
      lineTax,
      lineTotal,
      paymentTotal,
      headerMatches,
      paymentMatches,
    }
  }, [sale])

  if (loading) {
    return (
      <ProtectedLoadingPage
        title="Cargando detalle de venta"
        description="Estamos recuperando la venta confirmada y sus movimientos asociados."
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <ProtectedNotFoundPage />
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ProtectedForbiddenPage />
  }

  if (error || !sale) {
    return (
      <ProtectedErrorPage
        title="No pudimos abrir el detalle de venta"
        description={error?.message || "La venta solicitada no esta disponible para esta sede operativa."}
      />
    )
  }

  const documentPath = resolveSaleDocumentPath(sale)
  const canDownloadDocument = Boolean(documentPath)
  const downloadLabel =
    sale.document_type === "proforma"
      ? "Abrir proforma PDF"
      : sale.document_type === "boleta" || sale.document_type === "factura"
        ? "Abrir comprobante PDF"
        : "Sin documento PDF"

  const receiptStatus = resolveReceiptStatus(sale)
  const canRetryReceipt =
    has("sales.pos") &&
    sale.status === "confirmed" &&
    isReceiptDocument(sale.document_type) &&
    ["missing", "pending", "error", "unknown"].includes(receiptStatus)

  async function handleRetryReceipt() {
    if (!canRetryReceipt || !sale) {
      return
    }

    const saleId = sale.sale_id

    setRetryingReceipt(true)
    setRetryMessage(null)

    try {
      const refreshed = await apiFetch<SaleDetail>(`/api/sales/${saleId}/retry-receipt`, {
        method: "POST",
      })
      setSale(refreshed)
      setRetryMessage("Se ejecuto el reintento de emision del comprobante.")
    } catch (retryError) {
      setRetryMessage(
        retryError instanceof ApiError
          ? retryError.message || "No se pudo reintentar la emision del comprobante."
          : "No se pudo reintentar la emision del comprobante."
      )
    } finally {
      setRetryingReceipt(false)
    }
  }

  return (
    <PermissionGuard permission="sales.pos">
      <section className="sales-page min-h-screen px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href={appRoutes.transactionHistory}>
                <ArrowLeft className="h-4 w-4" />
                Volver al historial
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="rounded-lg bg-[var(--ripnel-accent)] text-white hover:bg-[var(--ripnel-accent-hover)]"
            >
              <Link href={appRoutes.purchaseSystem}>Registrar nueva venta</Link>
            </Button>
          </div>

          <PosHeader
            eyebrow="Detalle de venta"
            title={sale.sale_number || "Sin correlativo"}
            subtitle={`${sale.document_type} • ${sale.status} • ${new Date(
              sale.confirmed_at || sale.created_at
            ).toLocaleString("es-PE")}`}
            actions={
              canDownloadDocument ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-[color:color-mix(in_srgb,var(--ripnel-accent)_22%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)] hover:bg-[var(--ripnel-accent-soft)]"
                >
                  <a href={documentPath || "#"} target="_blank" rel="noreferrer">
                    <ReceiptText className="h-4 w-4" />
                    {downloadLabel}
                  </a>
                </Button>
              ) : (
                <span className="sales-chip rounded-lg px-3 py-2 text-sm font-medium text-[var(--ops-text-muted)]">
                  <ReceiptText className="h-4 w-4" />
                  {downloadLabel}
                </span>
              )
            }
          />

          <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Estado de comprobante</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      RECEIPT_STYLES[receiptStatus] || "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {RECEIPT_LABELS[receiptStatus] || receiptStatus}
                  </span>
                  {sale.receipt?.sunat_code ? (
                    <span className="text-xs text-slate-500">Codigo: {sale.receipt.sunat_code}</span>
                  ) : null}
                </div>
                {sale.receipt?.sunat_message ? (
                  <p className="mt-2 text-sm text-slate-600">{sale.receipt.sunat_message}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    {receiptStatus === "not_applicable"
                      ? "Esta venta no requiere emision SUNAT."
                      : "Aun no hay respuesta final del comprobante para esta venta."}
                  </p>
                )}
              </div>

              {canRetryReceipt ? (
                <button
                  type="button"
                  onClick={handleRetryReceipt}
                  disabled={retryingReceipt}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  {retryingReceipt ? "Reintentando..." : "Reemitir comprobante"}
                </button>
              ) : null}
            </div>

            {retryMessage ? <p className="mt-3 text-sm text-slate-600">{retryMessage}</p> : null}
          </article>

          {consistency && !consistency.headerMatches && (
            <InlineStatusCard
              title="La venta necesita revision"
              description="Los totales de cabecera no coinciden con la suma de las lineas persistidas. Conviene contrastar la venta antes de tomarla como referencia operativa."
              tone="warning"
            />
          )}

          {consistency && consistency.headerMatches && !consistency.paymentMatches && (
            <InlineStatusCard
              title="Pago inconsistente con el total"
              description="Las lineas coinciden con la cabecera, pero la suma de pagos registrados no cubre el total de la venta."
              tone="warning"
            />
          )}

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  Productos vendidos
                </h2>
                <div className="space-y-2">
                  {sale.details.map((line) => (
                    <div
                      key={line.sale_detail_id}
                      className="sales-panel-muted rounded-lg px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                          <p className="text-xs text-[var(--ops-text-muted)]">
                            {line.sku} • {line.size_code} / {line.color_code}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          S/. {Number(line.line_total).toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-[var(--ops-text-muted)] md:grid-cols-4">
                        <span>Cantidad: {line.quantity}</span>
                        <span>Lista: S/. {Number(line.unit_price_list).toFixed(2)}</span>
                        <span>Final: S/. {Number(line.unit_price_final).toFixed(2)}</span>
                        <span>Subtotal: S/. {Number(line.line_subtotal).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              {sale.notes && (
                <article className="sales-panel rounded-lg p-5 shadow-sm">
                  <h2 className="mb-2 text-base font-semibold text-[var(--ops-text)]">Notas</h2>
                  <p className="text-sm text-[var(--ops-text-muted)]">{sale.notes}</p>
                </article>
              )}
            </div>

            <div className="space-y-5">
              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <User className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  Cliente
                </h2>
                <div className="space-y-2 text-sm text-[var(--ops-text)]">
                  <p>
                    <span className="font-medium">Nombre:</span> {sale.customer_name_text || "Cliente general"}
                  </p>
                  <p>
                    <span className="font-medium">Documento:</span> {sale.customer_doc_type || "-"}{" "}
                    {sale.customer_doc_number || ""}
                  </p>
                  <p>
                    <span className="font-medium">Direccion:</span> {sale.customer_address_text || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Ubicacion:</span> {sale.location_name}
                  </p>
                  <p>
                    <span className="font-medium">Vendedor:</span> {sale.seller_name}
                  </p>
                </div>
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  Pagos
                </h2>
                <div className="space-y-2 text-sm text-[var(--ops-text)]">
                  {sale.payments.length === 0 ? (
                    <p>No hay pagos registrados.</p>
                  ) : (
                    sale.payments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="sales-panel-muted rounded-lg px-3 py-2"
                      >
                        <p className="font-medium capitalize text-[var(--ops-text)]">{payment.method}</p>
                        <p>Monto: S/. {Number(payment.amount).toFixed(2)}</p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          {new Date(payment.paid_at).toLocaleString("es-PE")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-[var(--ops-text)]">Resumen y consistencia</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>Subtotal cabecera</span>
                    <span>S/. {Number(sale.subtotal_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>IGV cabecera</span>
                    <span>S/. {Number(sale.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>Subtotal lineas</span>
                    <span>S/. {Number(consistency?.lineSubtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>IGV lineas</span>
                    <span>S/. {Number(consistency?.lineTax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>Total pagos</span>
                    <span>S/. {Number(consistency?.paymentTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-base font-semibold text-[var(--ops-text)]">
                    <span>Total venta</span>
                    <span>S/. {Number(sale.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                {consistency && (
                  <div className="mt-4 space-y-2 text-sm">
                    <div
                      className={`rounded-lg border px-3 py-2 ${
                        consistency.headerMatches
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {consistency.headerMatches
                        ? "Cabecera y lineas coinciden."
                        : "Cabecera y lineas no coinciden."}
                    </div>
                    <div
                      className={`rounded-lg border px-3 py-2 ${
                        consistency.paymentMatches
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {consistency.paymentMatches
                        ? "Los pagos cubren exactamente el total de la venta."
                        : "La suma de pagos no cubre el total de la venta."}
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
