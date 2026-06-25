"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CreditCard,
  Download,
  MoreHorizontal,
  ReceiptText,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ProtectedErrorPage,
  ProtectedLoadingPage,
} from "@/components/feedback/status-page"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { apiFetch } from "@/lib/api"
import { formatDate, formatDateTime } from "@/lib/date-utils"
import { explainApiError } from "@/lib/error-utils"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { formatDocumentType } from "@/components/modules/sales/sales-utils"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"
import type { PostsaleContext } from "@/types/postsales"
import { PS } from "./postsales-messages"
import {
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  INFO_BOX_XL,
} from "./postsales-constants"
import {
  BaseSalePanel,
  CancellationPanel,
  ExchangeTracePanel,
  PaymentsNetPanel,
  PostsaleActionsPanel,
} from "./postsale-detail-sections"
import ExchangeDialog from "./postsale-exchange-dialog"
import CancelDialog from "./postsale-cancel-dialog"

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
  if (status === "open") return PS.detail.fields.cashOpen
  if (status === "closed") return PS.detail.fields.cashClosed
  return PS.detail.fields.noCash
}

export default function PostsaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { has } = useAuth()
  const { saleId } = use(params)

  const [context, setContext] = useState<PostsaleContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadContext() {
      setLoading(true)
      setFetchError(null)
      try {
        const data = await apiFetch<PostsaleContext>(`/api/postsales/${saleId}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (active) setContext(data)
      } catch (loadError) {
        if (active) {
          setContext(null)
          setFetchError(explainApiError(loadError, PS.detail.errorDesc))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadContext()
    return () => {
      active = false
      controller.abort()
    }
  }, [saleId])

  function refetch() {
    setLoading(true)
    setFetchError(null)
    const controller = new AbortController()

    apiFetch<PostsaleContext>(`/api/postsales/${saleId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((data) => {
        setContext(data)
        setFetchError(null)
      })
      .catch((loadError) => {
        setFetchError(explainApiError(loadError, PS.detail.errorDesc))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [exchangeDialogKey, setExchangeDialogKey] = useState(0)
  const [cancelDialogKey, setCancelDialogKey] = useState(0)

  const paymentSummary = useMemo(() => {
    const paymentTotal = round2(
      (context?.sale.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0),
    )
    const reversalTotal = round2(
      (context?.payment_reversals || []).reduce((acc, r) => acc + Number(r.amount || 0), 0),
    )
    const netTotal = round2(paymentTotal - reversalTotal)
    const balanceDue = round2(Number(context?.sale.total_amount || 0) - netTotal)
    return {
      paymentTotal,
      reversalTotal,
      netTotal,
      balanceDue,
      isFullyPaid: Math.abs(balanceDue) < 0.01,
    }
  }, [context])

  if (loading && !context) {
    return (
      <ProtectedLoadingPage title={PS.detail.loading} description={PS.detail.loadingDesc} />
    )
  }

  if ((fetchError || !context) && !loading) {
    return (
      <ProtectedErrorPage
        title={PS.detail.error}
        description={fetchError || PS.detail.errorDesc}
      />
    )
  }

  if (!context) {
    return (
      <ProtectedLoadingPage title={PS.detail.loading} description={PS.detail.loadingDesc} />
    )
  }

  const documentPath = resolveDocumentPath(context)
  const isProforma = context.sale.document_type === "proforma"
  const canExchange = has("sales.postsale.exchange")
  const canCancel = has("sales.postsale.cancel")
  const exchangeAllowed = context.availability.exchange.allowed
  const cancelAllowed = context.availability.cancel.allowed

  const isFinalized = Boolean(context.cancellation) || context.exchanges.length > 0

  return (
    <PermissionGuard permission="sales.postsale.view">
      <OpsPageShell width="wide" className="space-y-5">
        <PosHeader
          eyebrow={PS.header.detailEyebrow}
          title={context.sale.sale_number || PS.table.noCorrelative}
          meta={
            <>
              <OpsStatusBadge tone="accent">
                {context.sale.document_type.toUpperCase()}
              </OpsStatusBadge>
              <OpsStatusBadge
                tone={
                  context.sale.cash_status === "open"
                    ? "success"
                    : context.sale.cash_status === "closed"
                      ? "danger"
                      : "warning"
                }
              >
                {cashStatusLabel(context.sale.cash_status)}
              </OpsStatusBadge>
              <OpsStatusBadge>
                {PS.detail.fields.operativeDate} {formatDate(context.sale.business_date)}
              </OpsStatusBadge>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link href="/postventa">
                  <ArrowLeft className="h-4 w-4" />
                  {PS.detail.back}
                </Link>
              </Button>

              {has("sales.pos") ? (
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href={buildSaleDetailRoute(context.sale.sale_id)}>
                    {PS.detail.viewFullSale}
                  </Link>
                </Button>
              ) : null}

              {documentPath && has("sales.pos") ? (
                isProforma ? (
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <a href={documentPath} target="_blank" rel="noreferrer">
                      <ReceiptText className="h-4 w-4" />
                      {PS.detail.openProforma}
                    </a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setReceiptModalOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    {PS.detail.downloadReceipt}
                  </Button>
                )
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                    {PS.detail.moreActions}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-48 rounded-lg">
                  {has("sales.pos") ? (
                    <DropdownMenuItem asChild>
                      <Link href={buildSaleDetailRoute(context.sale.sale_id)}>
                        <ReceiptText className="h-4 w-4" />
                        {PS.detail.registerPostsale}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={appRoutes.purchaseSystem}>
                      <ReceiptText className="h-4 w-4" />
                      {PS.detail.newSale}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-[var(--ops-text-muted)]">
                {formatDocumentType(context.sale.document_type)} · {formatDateTime(context.sale.confirmed_at || context.sale.created_at)} · {context.sale.location_name || PS.detail.sede}
              </p>
              <div>
                <p className="font-semibold text-[var(--ops-text)]">{context.sale.customer_name_text || PS.table.genericCustomer}</p>
                {context.sale.customer_doc_type || context.sale.customer_doc_number ? (
                  <p className="text-sm text-[var(--ops-text-muted)]">{context.sale.customer_doc_type} {context.sale.customer_doc_number}</p>
                ) : null}
              </div>
              <p className="text-xs text-[var(--ops-text-muted)]">
                {PS.detail.sellerAt}: {context.sale.seller_name || PS.table.fallbackDash} · {PS.detail.createdAt}: {formatDateTime(context.sale.created_at)}{context.sale.confirmed_at ? ` · ${PS.detail.confirmedAt}: ${formatDateTime(context.sale.confirmed_at)}` : ""}
              </p>
            </div>
            <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-60`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}>
                {PS.detail.totalHeader}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
                {formatCurrency(Number(context.sale.total_amount))}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                <span>
                  {PS.detail.paid} {formatCurrency(paymentSummary.netTotal)}
                </span>
                {!paymentSummary.isFullyPaid ? (
                  <OpsStatusBadge tone="warning">{PS.detail.partial}</OpsStatusBadge>
                ) : null}
              </div>
              {!paymentSummary.isFullyPaid && paymentSummary.balanceDue > 0 ? (
                <p className="mt-1 text-sm font-semibold text-[var(--ops-tone-warning-text)]">
                  {PS.detail.missing} {formatCurrency(paymentSummary.balanceDue)}
                </p>
              ) : null}
            </div>
          </div>
          {context.sale.notes ? (
            <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">
              {PS.detail.noteAt}: {context.sale.notes}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
          <div className="space-y-4">
            <BaseSalePanel context={context} />
            <ExchangeTracePanel context={context} />
            <CancellationPanel context={context} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <PostsaleActionsPanel
              context={context}
              canExchange={canExchange}
              canCancel={canCancel}
              exchangeAllowed={exchangeAllowed}
              cancelAllowed={cancelAllowed}
              isFinalized={isFinalized}
              onOpenExchange={() => {
                setExchangeDialogKey((k) => k + 1)
                setExchangeDialogOpen(true)
              }}
              onOpenCancel={() => {
                setCancelDialogKey((k) => k + 1)
                setCancelDialogOpen(true)
              }}
            />

            <OpsPanelSection
              title={PS.detail.sections.totals}
              icon={<ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              <div className="space-y-2">
                <OpsMetricRow label={PS.detail.subtotal} value={formatCurrency(Number(context.sale.subtotal_amount))} />
                {Number(context.sale.sale_discount_amount || 0) > 0 ? (
                  <OpsMetricRow label={PS.detail.discount} value={`-${formatCurrency(Number(context.sale.sale_discount_amount))}`} tone="warning" />
                ) : null}
                {Number(context.sale.tax_amount) !== 0 ? (
                  <OpsMetricRow label={PS.detail.tax} value={formatCurrency(Number(context.sale.tax_amount))} />
                ) : null}
                <div className="border-t border-[var(--ops-border-strong)] pt-2">
                  <OpsMetricRow label={PS.detail.totalAmount} value={formatCurrency(Number(context.sale.total_amount))} />
                </div>
                <div className="border-t border-[var(--ops-border-soft)] pt-2">
                  <OpsMetricRow label={PS.detail.units} value={String((context.sale.details || []).reduce((acc, d) => acc + Number(d.quantity || 0), 0))} />
                  <OpsMetricRow label={PS.detail.lineCount} value={String((context.sale.details || []).length)} />
                </div>
              </div>
            </OpsPanelSection>

            <OpsPanelSection
              title={PS.detail.sections.payments}
              icon={<CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              {(context.sale.payments || []).length === 0 && context.payment_reversals.length === 0 ? (
                <p className="py-2 text-sm text-[var(--ops-text-muted)]">{PS.detail.noPayments}</p>
              ) : (
                <PaymentsNetPanel context={context} paymentSummary={paymentSummary} />
              )}
            </OpsPanelSection>
          </aside>
        </div>

        <ReceiptOptionsModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          saleId={context.sale.sale_id}
          onOpenPreview={() => {
            setReceiptModalOpen(false)
            if (documentPath) window.open(documentPath, "_blank")
          }}
        />

        {context && canExchange ? (
          <ExchangeDialog
            key={`exchange-${exchangeDialogKey}`}
            open={exchangeDialogOpen}
            onOpenChange={setExchangeDialogOpen}
            saleId={saleId}
            context={context}
            isAllowed={exchangeAllowed}
            blockedReasons={context.availability.exchange.reasons}
            onSuccess={refetch}
          />
        ) : null}

        {context && canCancel ? (
          <CancelDialog
            key={`cancel-${cancelDialogKey}`}
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            saleId={saleId}
            isAllowed={cancelAllowed}
            blockedReasons={context.availability.cancel.reasons}
            onSuccess={refetch}
          />
        ) : null}
      </OpsPageShell>
    </PermissionGuard>
  )
}
