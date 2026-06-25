"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
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
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { ApiError, apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { appRoutes } from "@/lib/routes"
import {
  SALE_STATUS_META,
  SALE_STATUS_TONES,
  type SaleStatus,
  type SaleDetail,
  type SaleConsistency,
  isCloseEnough,
} from "@/types/sales"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { formatDateTime } from "@/lib/date-utils"
import { SH } from "./sales-history-messages"
import { ACCENT_HIGHLIGHT_PANEL, ACCENT_LABEL_TEXT, INFO_BOX, INFO_BOX_MUTED, INFO_BOX_XL } from "./sales-history-constants"
import {
  formatDocumentType,
  formatPaymentMethod,
  customerDocument,
} from "./sales-utils"

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = use(params)
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
        const data = await apiFetch<SaleDetail>(`/api/sales/${saleId}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (active) setSale(data)
      } catch (loadError) {
        if (active) {
          setSale(null)
          setError(loadError instanceof Error ? loadError : new Error(SH.detail.error))
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
  }, [saleId])

  const consistency: SaleConsistency | null = useMemo(() => {
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

  if (loading) {
    return <ProtectedLoadingPage title={SH.detail.loading} description={SH.detail.loadingDesc} />
  }

  if (error instanceof ApiError && error.status === 404) return <ProtectedNotFoundPage />
  if (error instanceof ApiError && error.status === 403) return <ProtectedForbiddenPage />

  if (error || !sale || !consistency) {
    return (
      <ProtectedErrorPage
        title={SH.detail.error}
        description={error ? explainApiError(error, SH.detail.errorDesc) : SH.detail.errorDesc}
      />
    )
  }

  const discountAmount = Number(sale.sale_discount_amount || 0)
  const docLabel = formatDocumentType(sale.document_type)
  const custDoc = customerDocument(sale.customer_doc_type, sale.customer_doc_number)
  const isProforma = sale.document_type === "proforma"
  const isInvoice = sale.document_type === "boleta" || sale.document_type === "factura"
  const hasDocument = isProforma || isInvoice
  const pdfUrl = isProforma
    ? `/api/sales/${sale.sale_id}/proforma-pdf`
    : isInvoice
      ? `/api/sales/${sale.sale_id}/pdf`
      : null

  return (
    <PermissionGuard permission="sales.pos">
      <OpsPageShell width="wide" className="space-y-5">
          {/* ── PosHeader ── */}
          <PosHeader
            eyebrow={SH.detail.eyebrow}
            title={sale.sale_number || SH.table.noCorrelative}
            meta={
              <OpsStatusBadge tone={SALE_STATUS_TONES[sale.status as SaleStatus] || "neutral"}>
                {SALE_STATUS_META[sale.status as SaleStatus]?.label || SH.detail.unknownStatus}
              </OpsStatusBadge>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={appRoutes.transactionHistory}>
                    <ArrowLeft className="h-4 w-4" />{SH.detail.back}
                  </Link>
                </Button>
                {hasDocument ? (
                  <>
                    {isProforma ? (
                      <Button type="button" variant="outline" size="sm" className="rounded-lg px-3" asChild>
                        <a href={`/api/sales/${sale.sale_id}/proforma-pdf`} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4" />{SH.detail.proformaPreview}
                        </a>
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="outline" size="sm" className="rounded-lg px-3" asChild>
                          <a href={`/api/sales/${sale.sale_id}/pdf`} target="_blank" rel="noreferrer">
                            <Eye className="h-4 w-4" />{SH.detail.previewLabel}
                          </a>
                        </Button>
                        <Button type="button" variant="accent" size="sm" className="rounded-lg px-3" onClick={() => setReceiptModalOpen(true)}>
                          <Download className="h-4 w-4" />{SH.detail.download}
                        </Button>
                      </>
                    )}
                  </>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg px-3">
                      <MoreHorizontal className="h-4 w-4" />{SH.detail.moreActions}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="min-w-48 rounded-lg">
                    {sale.status === "confirmed" ? (
                      <DropdownMenuItem asChild>
                        <Link href={`/postventa/${sale.sale_id}`}>{SH.detail.registerPostsale}</Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={appRoutes.purchaseSystem}><ReceiptText className="h-4 w-4" />{SH.detail.newSale}</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
          />

          {/* ── Detail info panel ── */}
          <div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {docLabel} · {formatDateTime(sale.confirmed_at || sale.created_at)} · {sale.location_name || SH.detail.sede}
                </p>
                <div>
                  <p className="font-semibold text-[var(--ops-text)]">{sale.customer_name_text || SH.table.genericCustomer}</p>
                  {custDoc ? <p className="text-sm text-[var(--ops-text-muted)]">{custDoc}</p> : null}
                </div>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  {SH.detail.seller}: {sale.seller_name || SH.detail.fallbackDash} · {SH.detail.created}: {formatDateTime(sale.created_at)}{sale.confirmed_at ? ` · ${SH.detail.confirmed}: ${formatDateTime(sale.confirmed_at)}` : ""}
                </p>
              </div>
              <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-60`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}>
                  {SH.detail.totalHeader}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">{formatCurrency(Number(sale.total_amount))}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                  <span>{SH.detail.paid} {formatCurrency(consistency.paymentTotal)}</span>
                  {!consistency.paymentMatches ? (
                    <OpsStatusBadge tone="warning">{SH.detail.partial}</OpsStatusBadge>
                  ) : null}
                </div>
                {!consistency.paymentMatches && consistency.balanceDue > 0 ? (
                  <p className="mt-1 text-sm font-semibold text-[var(--ops-tone-warning-text)]">
                    {SH.detail.missing} {formatCurrency(consistency.balanceDue)}
                  </p>
                ) : null}
              </div>
            </div>
            {sale.notes ? (
              <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">
                {SH.detail.note}: {sale.notes}
              </p>
            ) : null}
          </div>

          {/* ── Products + Summary ── */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
            {/* Products table */}
            <OpsPanelSection
              title={SH.detail.products}
              icon={<Package className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              <div className={`-mx-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl ${sale.details.length === 0 ? "" : "-mb-[var(--ops-panel-padding)]"}`}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[var(--ops-surface-muted)]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        <th scope="col" className="px-4 py-3">{SH.table.columns.sale}</th>
                        <th scope="col" className="px-4 py-3">{SH.table.columns.variant}</th>
                        <th scope="col" className="px-4 py-3 text-right">{SH.table.columns.quantity}</th>
                        <th scope="col" className="px-4 py-3 text-right">{SH.table.columns.unitPrice}</th>
                        <th scope="col" className="px-4 py-3 text-right">{SH.table.columns.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {sale.details.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">{SH.detail.noProducts}</td>
                        </tr>
                      ) : (
                        sale.details.map((line) => {
                          const quantity = Number(line.quantity || 0)
                          const finalPrice = Number(line.unit_price_final || 0)
                          const listPrice = Number(line.unit_price_list || 0)
                          const lineDiscount = Math.max(0, round2((listPrice - finalPrice) * quantity))

                          return (
                            <tr key={line.sale_detail_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                              <td className="px-4 py-[var(--ops-row-py)] align-top">
                                <p className="font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                                <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{line.style_code || line.sku || SH.detail.fallbackDash}</p>
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] align-top text-[var(--ops-text)]">
                                {line.size_code || SH.detail.fallbackSize} / {line.color_code || SH.detail.fallbackColor}
                                <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">{line.sku}</p>
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right font-medium text-[var(--ops-text)]">{quantity}</td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                                <p className="font-medium text-[var(--ops-text)]">{formatCurrency(finalPrice)}</p>
                                {!isCloseEnough(listPrice, finalPrice) ? (
                                  <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">{SH.detail.listPriceLabel} {formatCurrency(listPrice)}</p>
                                ) : null}
                                {lineDiscount > 0 ? (
                                  <p className="text-[11px] text-[var(--ops-tone-danger-text)]">-{formatCurrency(lineDiscount)}</p>
                                ) : null}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right font-semibold text-[var(--ops-text)]">{formatCurrency(Number(line.line_total))}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </OpsPanelSection>

            {/* Summary + Payments sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-20">
              <OpsPanelSection
                title={SH.detail.totals}
                icon={<ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />}
              >
                <div className="space-y-2">
                  <OpsMetricRow label={SH.detail.subtotal} value={formatCurrency(Number(sale.subtotal_amount))} />
                  {discountAmount > 0 ? <OpsMetricRow label={SH.detail.discount} value={`-${formatCurrency(discountAmount)}`} tone="warning" /> : null}
                  {Number(sale.tax_amount) !== 0 ? <OpsMetricRow label={SH.detail.tax} value={formatCurrency(Number(sale.tax_amount))} /> : null}
                  <div className="border-t border-[var(--ops-border-strong)] pt-2">
                    <OpsMetricRow label={SH.detail.totalAmount} value={formatCurrency(Number(sale.total_amount))} />
                  </div>
                  <div className="border-t border-[var(--ops-border-soft)] pt-2">
                    <OpsMetricRow label={SH.detail.units} value={String(consistency.unitCount)} />
                    <OpsMetricRow label={SH.detail.lines} value={String(sale.details.length)} />
                  </div>
                </div>
              </OpsPanelSection>

              <OpsPanelSection
                title={SH.detail.payments}
                icon={<CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />}
              >
                {sale.payments.length === 0 ? (
                  <p className="py-2 text-sm text-[var(--ops-text-muted)]">{SH.detail.noPayments}</p>
                ) : (
                  <div className="space-y-2">
                    {sale.payments.map((p) => (
                      <div key={p.payment_id} className={INFO_BOX_MUTED}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ops-text)]">{formatPaymentMethod(p.method)}</p>
                            <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{formatDateTime(p.paid_at)}</p>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-[var(--ops-text)]">{formatCurrency(Number(p.amount))}</p>
                        </div>
                        {p.reference ? <p className="mt-1.5 text-[11px] text-[var(--ops-text-muted)]">{SH.detail.referenceLabel} {p.reference}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </OpsPanelSection>
            </aside>
          </div>

          {/* ── Receipt Modal ── */}
          <ReceiptOptionsModal
            open={receiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            saleId={sale.sale_id}
            onOpenPreview={() => {
              setReceiptModalOpen(false)
              if (pdfUrl) window.open(pdfUrl, "_blank")
            }}
          />
      </OpsPageShell>
    </PermissionGuard>
  )
}
