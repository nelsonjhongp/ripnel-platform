"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CreditCard, ReceiptText, User } from "lucide-react"

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
import { cn } from "@/lib/utils"

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
  sale_discount_amount: number
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
}

const SALE_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  draft: "Borrador",
  cancelled: "Anulada",
}

const SALE_STATUS_CLASSES: Record<string, string> = {
  confirmed: "sales-chip sales-chip-success",
  draft: "sales-chip sales-chip-warning",
  cancelled: "sales-chip sales-chip-danger",
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function isCloseEnough(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

function formatDateTime(value: string | null, fallback?: string | null) {
  const source = value || fallback
  if (!source) {
    return "-"
  }

  return new Date(source).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function MetaPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--ops-text)]">{value}</span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm",
        strong ? "font-semibold text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"
      )}
    >
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function ConsistencyBadge({
  ok,
  okLabel,
  warningLabel,
}: {
  ok: boolean
  okLabel: string
  warningLabel: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium",
        ok
          ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
          : "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_82%,var(--ops-text))]"
      )}
    >
      {ok ? okLabel : warningLabel}
    </div>
  )
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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
    const unitCount = sale.details.reduce((accumulator, line) => accumulator + Number(line.quantity || 0), 0)

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
      unitCount,
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

  return (
    <PermissionGuard permission="sales.pos">
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-5">
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
            eyebrow="Operacion comercial"
            title={sale.sale_number || "Sin correlativo"}
            meta={
              <div className="flex flex-wrap gap-2">
                <MetaPill label="Documento" value={sale.document_type} />
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium",
                    SALE_STATUS_CLASSES[sale.status] || "sales-chip"
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Estado</span>
                  <span>{SALE_STATUS_LABELS[sale.status] || sale.status}</span>
                </div>
                <MetaPill
                  label={sale.confirmed_at ? "Confirmada" : "Registrada"}
                  value={formatDateTime(sale.confirmed_at, sale.created_at)}
                />
              </div>
            }
            actions={
              sale.status === "confirmed" ? (
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={`/postventa/${sale.sale_id}`}>Postventa</Link>
                </Button>
              ) : null
            }
          />

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

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.95fr]">
            <div className="space-y-5">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  <h2 className="text-base font-semibold text-[var(--ops-text)]">Detalle comercial</h2>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[720px] border-y border-[var(--ops-border-strong)]">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface-muted)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Variante</th>
                          <th className="px-4 py-3 text-right">Cant.</th>
                          <th className="px-4 py-3 text-right">Precio</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {sale.details.map((line) => (
                          <tr
                            key={line.sale_detail_id}
                            className="transition hover:bg-[var(--ops-surface-muted)]"
                          >
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {line.style_code || line.sku}
                              </p>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <p className="text-sm text-[var(--ops-text)]">
                                {line.size_code} / {line.color_code}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {line.sku}
                              </p>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-medium text-[var(--ops-text)]">
                              {line.quantity}
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                              <p className="text-sm font-medium text-[var(--ops-text)]">
                                S/. {Number(line.unit_price_final).toFixed(2)}
                              </p>
                              {Number(line.unit_price_list) !== Number(line.unit_price_final) ? (
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                  Lista S/. {Number(line.unit_price_list).toFixed(2)}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                S/. {Number(line.line_total).toFixed(2)}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                Subtotal S/. {Number(line.line_subtotal).toFixed(2)}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>

              {sale.notes ? (
                <article className="sales-panel rounded-lg p-5 shadow-sm">
                  <h2 className="mb-2 text-base font-semibold text-[var(--ops-text)]">Notas operativas</h2>
                  <p className="text-sm text-[var(--ops-text-muted)]">{sale.notes}</p>
                </article>
              ) : null}
            </div>

            <div className="space-y-5">
              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-[var(--ops-text)]">Resumen comercial</h2>

                <div className="space-y-2">
                  <SummaryRow label="Items vendidos" value={String(sale.details.length)} />
                  <SummaryRow label="Unidades" value={String(consistency?.unitCount || 0)} />
                  <SummaryRow
                    label="Subtotal cabecera"
                    value={`S/. ${Number(sale.subtotal_amount).toFixed(2)}`}
                  />
                  {Number(sale.sale_discount_amount || 0) > 0 ? (
                    <SummaryRow
                      label="Descuento"
                      value={`S/. ${Number(sale.sale_discount_amount).toFixed(2)}`}
                    />
                  ) : null}
                  <SummaryRow label="IGV" value={`S/. ${Number(sale.tax_amount).toFixed(2)}`} />
                  <SummaryRow
                    label="Pagos registrados"
                    value={`S/. ${Number(consistency?.paymentTotal || 0).toFixed(2)}`}
                  />
                  <div className="border-t border-[var(--ops-border-strong)] pt-2">
                    <SummaryRow
                      label="Total venta"
                      value={`S/. ${Number(sale.total_amount).toFixed(2)} ${sale.currency}`}
                      strong
                    />
                  </div>
                </div>

                {consistency ? (
                  <div className="mt-4 space-y-2">
                    <ConsistencyBadge
                      ok={consistency.headerMatches}
                      okLabel="Cabecera y lineas coinciden."
                      warningLabel="Cabecera y lineas no coinciden."
                    />
                    <ConsistencyBadge
                      ok={consistency.paymentMatches}
                      okLabel="Los pagos cubren exactamente el total."
                      warningLabel="La suma de pagos no cubre el total."
                    />
                  </div>
                ) : null}
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <User className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  Trazabilidad operativa
                </h2>

                <div className="space-y-3 text-sm">
                  <SummaryRow label="Cliente" value={sale.customer_name_text || "Cliente general"} />
                  <SummaryRow
                    label="Documento cliente"
                    value={
                      sale.customer_doc_type || sale.customer_doc_number
                        ? `${sale.customer_doc_type || "-"} ${sale.customer_doc_number || ""}`.trim()
                        : "-"
                    }
                  />
                  <SummaryRow label="Direccion" value={sale.customer_address_text || "-"} />
                  <SummaryRow label="Sede" value={sale.location_name} />
                  <SummaryRow label="Vendedor" value={sale.seller_name} />
                  <SummaryRow label="Registrada" value={formatDateTime(sale.created_at)} />
                  <SummaryRow
                    label="Confirmada"
                    value={sale.confirmed_at ? formatDateTime(sale.confirmed_at) : "Pendiente"}
                  />
                </div>
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  Pagos
                </h2>

                <div className="space-y-2 text-sm text-[var(--ops-text)]">
                  {sale.payments.length === 0 ? (
                    <p className="text-[var(--ops-text-muted)]">No hay pagos registrados.</p>
                  ) : (
                    sale.payments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="sales-panel-muted rounded-lg px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium capitalize text-[var(--ops-text)]">{payment.method}</p>
                            {payment.reference ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                Ref. {payment.reference}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            S/. {Number(payment.amount).toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {formatDateTime(payment.paid_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
