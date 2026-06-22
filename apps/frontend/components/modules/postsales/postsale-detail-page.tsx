"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CreditCard,
  Download,
  MoreHorizontal,
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
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { apiFetch } from "@/lib/api"
import { formatDate, formatDateTime } from "@/lib/date-utils"
import { explainApiError } from "@/lib/error-utils"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { PostsaleContext } from "@/types/postsales"
import { PS } from "./postsales-messages"
import {
  ACCENT_HIGHLIGHT_PANEL,
  ACCENT_LABEL_TEXT,
  CARD_BASE,
  INFO_BOX,
  INFO_BOX_MUTED,
} from "./postsales-constants"
import ExchangeDialog from "./postsale-exchange-dialog"
import CancelDialog from "./postsale-cancel-dialog"

const mutedBlockClass = cn(INFO_BOX_MUTED, "px-3 py-3")

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

  const hasCancellation = Boolean(context.cancellation)
  const hasExchanges = context.exchanges.length > 0
  const isFinalized = hasCancellation || hasExchanges

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

        <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}
              >
                {PS.detail.totalHeader}
              </p>
              <p className="text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
                {formatCurrency(Number(context.sale.total_amount))}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                <span>
                  {PS.detail.paid} {formatCurrency(paymentSummary.netTotal)}
                </span>
                {!paymentSummary.isFullyPaid ? (
                  <OpsStatusBadge tone="warning">{PS.detail.partial}</OpsStatusBadge>
                ) : null}
              </div>
              {!paymentSummary.isFullyPaid && paymentSummary.balanceDue > 0 ? (
                <p className="text-sm font-semibold text-[var(--ops-tone-warning-text)]">
                  {PS.detail.missing} {formatCurrency(paymentSummary.balanceDue)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
          <div className="space-y-4">
            <OpsPanelSection
              title={PS.detail.sections.baseSale}
              icon={<PackageSearch className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
            >
              <div className="space-y-2.5">
                {context.sale.details.map((line) => (
                  <div
                    key={line.sale_detail_id}
                    className={cn(CARD_BASE, "rounded-lg px-3 py-3")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {line.style_name}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                          {line.sku} &middot; {line.size_code} / {line.color_code}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[var(--ops-text)]">
                        {formatCurrency(Number(line.line_total))}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--ops-text-muted)] md:grid-cols-4">
                      <span>
                        {PS.detail.lines.quantity} {line.quantity}
                      </span>
                      <span>
                        {PS.detail.lines.listPrice}{" "}
                        {formatCurrency(Number(line.unit_price_list))}
                      </span>
                      <span>
                        {PS.detail.lines.finalPrice}{" "}
                        {formatCurrency(Number(line.unit_price_final))}
                      </span>
                      <span>
                        {PS.detail.lines.lineSubtotal}{" "}
                        {formatCurrency(Number(line.line_subtotal))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </OpsPanelSection>

            {hasExchanges ? (
              <OpsPanelSection
                title={PS.detail.sections.exchangeTrace}
                icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
              >
                <div className="space-y-3">
                  {context.exchanges.map((ex) => (
                    <div key={ex.exchange_id} className={mutedBlockClass}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ops-text)]">
                            {ex.exchange_number || ex.exchange_id}
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            {ex.reason || PS.table.fallbackNoReason} &middot;{" "}
                            {formatDateTime(ex.confirmed_at, ex.created_at)}
                          </p>
                        </div>
                        <OpsStatusBadge tone="success">{ex.status}</OpsStatusBadge>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {ex.lines.map((l) => (
                          <div key={l.exchange_line_id} className={INFO_BOX}>
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {l.direction === "IN"
                                ? PS.detail.lines.exchangeIn
                                : PS.detail.lines.exchangeOut}{" "}
                              &middot; {l.style_name}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                              {l.sku} &middot; {l.size_code} / {l.color_code}
                            </p>
                            <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                              {PS.detail.lines.quantity} {l.quantity} &middot;{" "}
                              {PS.detail.lines.referenceAbbr}{" "}
                              {formatCurrency(Number(l.unit_reference_price || 0))}
                            </p>
                          </div>
                        ))}
                      </div>
                      {ex.notes ? (
                        <p className="mt-3 text-sm text-[var(--ops-text-muted)]">{ex.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </OpsPanelSection>
            ) : null}

            {hasCancellation ? (
              <OpsPanelSection title={PS.detail.sections.cancellation} tone="danger">
                <p className="text-sm text-[var(--ops-tone-danger-text)]">
                  {context.cancellation!.reason} &middot;{" "}
                  {formatDateTime(context.cancellation!.cancelled_at)}
                </p>
                {context.cancellation!.notes ? (
                  <p className="mt-2 text-sm text-[var(--ops-tone-danger-text)]">
                    {context.cancellation!.notes}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-danger-text)]">
                  {PS.detail.fields.executedBy}{" "}
                  {context.cancellation!.cancelled_by_name || PS.table.fallbackUnknownUser}
                </p>
              </OpsPanelSection>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">

            <OpsPanelSection
              title={PS.detail.sections.actions}
              icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
            >
              <div className="space-y-3">
                {isFinalized ? (
                  <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-3">
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      <ShieldAlert className="mr-2 inline-block h-4 w-4 text-[var(--ops-text-muted)]" />
                      {PS.detail.actionsPanel.finalized}
                    </p>
                  </div>
                ) : (
                  <>
                    {canExchange ? (
                      exchangeAllowed ? (
                        <Button
                          variant="accent"
                          size="sm"
                          className="w-full rounded-lg"
                          onClick={() => {
                            setExchangeDialogKey((k) => k + 1)
                            setExchangeDialogOpen(true)
                          }}
                        >
                          <RefreshCcw className="h-4 w-4" />
                          {PS.detail.sections.simpleExchange}
                        </Button>
                      ) : (
                        <div className="rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-3">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-warning-text)]" />
                            <p className="text-sm text-[var(--ops-tone-warning-text)]">
                              {context.availability.exchange.reasons.join(" ") || PS.detail.actionsPanel.exchangeBlocked}
                            </p>
                          </div>
                        </div>
                      )
                    ) : null}

                    {canCancel ? (
                      cancelAllowed ? (
                        <Button
                          variant="accent"
                          size="sm"
                          className="w-full rounded-lg"
                          onClick={() => {
                            setCancelDialogKey((k) => k + 1)
                            setCancelDialogOpen(true)
                          }}
                        >
                          <Undo2 className="h-4 w-4" />
                          {PS.detail.sections.totalCancellation}
                        </Button>
                      ) : (
                        <div className="rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-3">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-warning-text)]" />
                            <p className="text-sm text-[var(--ops-tone-warning-text)]">
                              {context.availability.cancel.reasons.join(" ") || PS.detail.actionsPanel.cancelBlocked}
                            </p>
                          </div>
                        </div>
                      )
                    ) : null}

                    {!canExchange && !canCancel ? (
                      <p className="text-sm text-[var(--ops-text-muted)]">
                        {PS.detail.actionsPanel.finalized}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </OpsPanelSection>

            <OpsPanelSection
              title={PS.detail.sections.customerOperation}
              icon={<User className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
            >
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className={mutedBlockClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {PS.detail.fields.client}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                    {context.sale.customer_name_text || PS.table.genericCustomer}
                  </p>
                </div>
                <div className={mutedBlockClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {PS.detail.fields.document}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text)]">
                    {context.sale.customer_doc_type || PS.table.fallbackDash}{" "}
                    {context.sale.customer_doc_number || ""}
                  </p>
                </div>
                <div className={mutedBlockClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {PS.detail.fields.location}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text)]">
                    {context.sale.location_name}
                  </p>
                </div>
                <div className={mutedBlockClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {PS.detail.fields.seller}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text)]">
                    {context.sale.seller_name}
                  </p>
                </div>
                <div className={cn(mutedBlockClass, "md:col-span-2")}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {PS.detail.fields.address}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text)]">
                    {context.sale.customer_address_text || PS.table.fallbackDash}
                  </p>
                </div>
              </div>
            </OpsPanelSection>

            <OpsPanelSection
              title={PS.detail.sections.paymentsNet}
              icon={<CreditCard className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
            >
              <div className="space-y-2">
                {(context.sale.payments || []).map((payment) => (
                  <div key={payment.payment_id} className={mutedBlockClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold capitalize text-[var(--ops-text)]">
                          {payment.method}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                          {formatDateTime(payment.paid_at)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                    </div>
                    {payment.reference ? (
                      <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                        {PS.detail.lines.referenceAbbr} {payment.reference}
                      </p>
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
                              {PS.detail.payments.reversalMethod} {reversal.method}
                            </p>
                            <p className="mt-1 text-xs text-[var(--ops-tone-danger-text)]">
                              {reversal.reason} &middot;{" "}
                              {formatDateTime(reversal.reversed_at)}
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

              <div className="mt-4 space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
                <OpsMetricRow
                  label={PS.detail.payments.registered}
                  value={formatCurrency(paymentSummary.paymentTotal)}
                />
                <OpsMetricRow
                  label={PS.detail.payments.reversals}
                  value={formatCurrency(paymentSummary.reversalTotal)}
                />
                <div className="border-t border-[var(--ops-border-strong)] pt-2">
                  <OpsMetricRow
                    label={PS.detail.payments.net}
                    value={formatCurrency(paymentSummary.netTotal)}
                  />
                </div>
              </div>
            </OpsPanelSection>

            {context.sale.notes ? (
              <OpsPanelSection title={PS.detail.sections.originalNotes}>
                <p className="text-sm text-[var(--ops-text-muted)]">{context.sale.notes}</p>
              </OpsPanelSection>
            ) : null}
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
