"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CreditCard,
  Download,
  Eye,
  MoreHorizontal,
  Package,
  ReceiptText,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ProtectedErrorPage,
  ProtectedForbiddenPage,
  ProtectedLoadingPage,
  ProtectedNotFoundPage,
} from "@/components/feedback/status-page"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { ApiError, apiFetch } from "@/lib/api"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS, SALE_STATUS_META, SALE_STATUS_TONES, type SaleStatus } from "@/types/sales"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { formatDateTime } from "@/lib/date-utils"

type SaleDetail = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  customer_doc_type: string | null
  customer_doc_number: string | null
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

type SaleConsistency = {
  paymentTotal: number
  balanceDue: number
  unitCount: number
  paymentMatches: boolean
}

function isCloseEnough(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

function formatDocumentType(value: string) {
  if (!value) return "Documento"
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (l) => l.toUpperCase())
}

function formatPaymentMethod(value: string) {
  const normalized = String(value || "").trim().toLowerCase()
  return PAYMENT_METHOD_LABELS[normalized] || formatDocumentType(value)
}

function customerDocument(sale: SaleDetail) {
  if (!sale.customer_doc_type && !sale.customer_doc_number) return null
  return `${sale.customer_doc_type || ""} ${sale.customer_doc_number || ""}`.trim()
}

function SummaryRow({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", strong && "font-semibold text-[var(--ops-text)]", muted && "text-[var(--ops-text-muted)]", !strong && !muted && "text-[var(--ops-text)]")}>
      <span className="text-[var(--ops-text-muted)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadSale() {
      setLoading(true)
      setError(null)
      try {
        const { saleId } = await params
        const data = await apiFetch<SaleDetail>(`/api/sales/${saleId}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (active) setSale(data)
      } catch (loadError) {
        if (active) {
          setSale(null)
          setError(loadError instanceof Error ? loadError : new Error("No se pudo cargar la venta"))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSale()
    return () => {
      active = false
      controller.abort()
    }
  }, [params])

  const consistency = useMemo(() => {
    if (!sale) return null
    const paymentTotal = round2(sale.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0))
    const unitCount = sale.details.reduce((acc, d) => acc + Number(d.quantity || 0), 0)
    return {
      paymentTotal,
      balanceDue: round2(Number(sale.total_amount || 0) - paymentTotal),
      unitCount,
      paymentMatches: isCloseEnough(paymentTotal, Number(sale.total_amount || 0)),
    }
  }, [sale])

  // ── Loading / Error / Empty states ──

  if (loading) {
    return <ProtectedLoadingPage title="Cargando detalle de venta" description="Recuperando datos de la operación." />
  }

  if (error instanceof ApiError && error.status === 404) return <ProtectedNotFoundPage />
  if (error instanceof ApiError && error.status === 403) return <ProtectedForbiddenPage />

  if (error || !sale || !consistency) {
    return (
      <ProtectedErrorPage
        title="No pudimos abrir el detalle de venta"
        description={error?.message || "La venta solicitada no está disponible para esta sede."}
      />
    )
  }

  const discountAmount = Number(sale.sale_discount_amount || 0)
  const docLabel = formatDocumentType(sale.document_type)
  const custDoc = customerDocument(sale)

  return (
    <PermissionGuard permission="sales.pos">
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1280px] space-y-5">

          {/* ── Top bar ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" size="sm" className="w-fit rounded-lg px-3">
              <Link href={appRoutes.transactionHistory}>
                <ArrowLeft className="h-4 w-4" />Volver al historial
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-lg px-3" asChild>
                <a href={`/api/sales/${sale.sale_id}/pdf`} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />Vista previa
                </a>
              </Button>
              <Button type="button" variant="accent" size="sm" className="rounded-lg px-3" onClick={() => setReceiptModalOpen(true)}>
                <Download className="h-4 w-4" />Descargar comprobante
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg px-3">
                    <MoreHorizontal className="h-4 w-4" />Más acciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-48 rounded-lg">
                  {sale.status === "confirmed" ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/postventa/${sale.sale_id}`}>Registrar postventa</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={appRoutes.purchaseSystem}><ReceiptText className="h-4 w-4" />Nueva venta</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Header ── */}
          <header className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[var(--ops-text)]">{sale.sale_number || "Sin correlativo"}</h1>
                  <OpsStatusBadge tone={SALE_STATUS_TONES[sale.status as SaleStatus] || "neutral"}>
                    {SALE_STATUS_META[sale.status as SaleStatus]?.label || docLabel}
                  </OpsStatusBadge>
                </div>
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {docLabel} · {formatDateTime(sale.confirmed_at || sale.created_at)} · {sale.location_name || "Sede no registrada"}
                </p>
                <div>
                  <p className="font-semibold text-[var(--ops-text)]">{sale.customer_name_text || "Cliente general"}</p>
                  {custDoc ? <p className="text-sm text-[var(--ops-text-muted)]">{custDoc}</p> : null}
                </div>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  Vendedor: {sale.seller_name || "-"} · Creada: {formatDateTime(sale.created_at)}{sale.confirmed_at ? ` · Confirmada: ${formatDateTime(sale.confirmed_at)}` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))] px-4 py-3 lg:min-w-60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--ripnel-accent)_78%,var(--ops-text))]">Total venta</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">{formatCurrency(Number(sale.total_amount))}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                  <span>Pagado {formatCurrency(consistency.paymentTotal)}</span>
                  {!consistency.paymentMatches ? (
                    <OpsStatusBadge tone="warning">Parcial</OpsStatusBadge>
                  ) : null}
                </div>
              </div>
            </div>
            {sale.notes ? <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">Nota: {sale.notes}</p> : null}
          </header>

          {/* ── Products + Summary ── */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
            {/* Products table */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                <Package className="h-4 w-4 text-[var(--ripnel-accent)]" />Productos
              </h2>
              <article className="sales-panel rounded-lg p-0 shadow-sm">
                <OpsDataTable
                  columns={[
                    { key: "producto", header: "Producto" },
                    { key: "variante", header: "Variante" },
                    { key: "cant", header: "Cant.", className: "text-right" },
                    { key: "p_unit", header: "P. Unit.", className: "text-right" },
                    { key: "total", header: "Total", className: "text-right" },
                  ]}
                  isEmpty={sale.details.length === 0}
                  emptyMessage="Sin productos registrados."
                >
                  {sale.details.map((line) => {
                    const quantity = Number(line.quantity || 0)
                    const finalPrice = Number(line.unit_price_final || 0)
                    const listPrice = Number(line.unit_price_list || 0)
                    const lineDiscount = Math.max(0, round2((listPrice - finalPrice) * quantity))

                    return (
                      <tr key={line.sale_detail_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <p className="font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{line.style_code || line.sku || "-"}</p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-[var(--ops-text)]">
                          {line.size_code || "ST"} / {line.color_code || "Único"}
                          <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">{line.sku}</p>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right font-medium text-[var(--ops-text)]">{quantity}</td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                          <p className="font-medium text-[var(--ops-text)]">{formatCurrency(finalPrice)}</p>
                          {!isCloseEnough(listPrice, finalPrice) ? (
                            <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">Lista {formatCurrency(listPrice)}</p>
                          ) : null}
                          {lineDiscount > 0 ? (
                            <p className="text-[11px] text-[color:color-mix(in_srgb,#dc2626_76%,var(--ops-text))]">-{formatCurrency(lineDiscount)}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] text-right font-semibold text-[var(--ops-text)]">{formatCurrency(Number(line.line_total))}</td>
                      </tr>
                    )
                  })}
                </OpsDataTable>
              </article>
            </section>

            {/* Summary + Payments sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-20">
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />Totales
                </h2>
                <article className="sales-panel rounded-lg p-5 shadow-sm space-y-2">
                  <SummaryRow label="Subtotal" value={formatCurrency(Number(sale.subtotal_amount))} muted />
                  {discountAmount > 0 ? <SummaryRow label="Descuento" value={`-${formatCurrency(discountAmount)}`} muted /> : null}
                  <SummaryRow label="IGV" value={formatCurrency(Number(sale.tax_amount))} muted />
                  <div className="border-t border-[var(--ops-border-strong)] pt-2">
                    <SummaryRow label="Total" value={formatCurrency(Number(sale.total_amount))} strong />
                  </div>
                  <div className="border-t border-[var(--ops-border-soft)] pt-2">
                    <SummaryRow label="Unidades" value={String(consistency.unitCount)} muted />
                    <SummaryRow label="Líneas" value={String(sale.details.length)} muted />
                  </div>
                </article>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--ops-text)]">
                  <CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />Pagos
                </h2>
                <article className="sales-panel rounded-lg p-5 shadow-sm">
                  {sale.payments.length === 0 ? (
                    <p className="py-2 text-sm text-[var(--ops-text-muted)]">Sin pagos registrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {sale.payments.map((p) => (
                        <div key={p.payment_id} className="sales-panel-muted rounded-lg px-3 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--ops-text)]">{formatPaymentMethod(p.method)}</p>
                              <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{formatDateTime(p.paid_at)}</p>
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-[var(--ops-text)]">{formatCurrency(Number(p.amount))}</p>
                          </div>
                          {p.reference ? <p className="mt-1.5 text-[11px] text-[var(--ops-text-muted)]">Ref. {p.reference}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </section>
            </aside>
          </div>

          {/* ── Receipt Modal ── */}
          <ReceiptOptionsModal
            open={receiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            saleId={sale.sale_id}
            onOpenPreview={() => setReceiptModalOpen(false)}
          />
        </div>
      </section>
    </PermissionGuard>
  )
}
