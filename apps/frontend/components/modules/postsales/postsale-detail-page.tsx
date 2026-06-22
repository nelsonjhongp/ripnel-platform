"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  LoaderCircle,
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
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { apiFetchData } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { buildSaleDetailRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useApiGet } from "@/hooks/use-api-get"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { formatDateTime } from "@/lib/date-utils"
import type { PostsaleContext, SaleLine } from "@/types/postsales"
import { PS } from "./postsales-messages"
import { INFO_BOX, INFO_BOX_MUTED } from "./postsales-constants"
import { useReplacementSearch } from "./use-replacement-search"
import { useExchangeForm } from "./use-exchange-form"
import { useCancelForm } from "./use-cancel-form"

const mutedBlockClass = cn(
  INFO_BOX_MUTED,
  "px-3 py-3",
)

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

function computeCandidateTotal(candidate: { retail_price: number }, line: SaleLine, taxRate: number) {
  const subtotal = round2(Number(candidate.retail_price || 0) * Number(line.quantity || 0))
  const tax = round2(subtotal * Number(taxRate || 0))
  return round2(subtotal + tax)
}

export default function PostsaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { has } = useAuth()
  const [saleId, setSaleId] = useState<string | null>(null)
  const { data: context, loading, error, refetch } = useApiGet(
    saleId ? () => apiFetchData<PostsaleContext>(`/api/postsales/${saleId}`) : null,
    [saleId],
  )

  const [selectedSaleDetailId, setSelectedSaleDetailId] = useState<string>("")
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    params.then(({ saleId: resolvedSaleId }) => {
      if (active) setSaleId(resolvedSaleId)
    })
    return () => { active = false }
  }, [params])

  useEffect(() => {
    const firstLine = context?.sale.details?.[0]?.sale_detail_id || ""
    if (!selectedSaleDetailId || !context?.sale.details.some((l) => l.sale_detail_id === selectedSaleDetailId)) {
      queueMicrotask(() => setSelectedSaleDetailId(firstLine))
    }
  }, [context, selectedSaleDetailId])

  const replacement = useReplacementSearch(context, has("sales.postsale.exchange"))
  const exchange = useExchangeForm(saleId, refetch)
  const cancel = useCancelForm(saleId, refetch)

  const selectedLine = useMemo(
    () => context?.sale.details.find((l) => l.sale_detail_id === selectedSaleDetailId) || null,
    [context, selectedSaleDetailId],
  )

  const paymentSummary = useMemo(() => {
    const paymentTotal = round2(
      (context?.sale.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0),
    )
    const reversalTotal = round2(
      (context?.payment_reversals || []).reduce((acc, r) => acc + Number(r.amount || 0), 0),
    )
    return {
      paymentTotal,
      reversalTotal,
      netTotal: round2(paymentTotal - reversalTotal),
    }
  }, [context])

  const combinedError = exchange.exchangeError || cancel.cancelError || null
  const combinedSuccess = exchange.exchangeSuccess || cancel.cancelSuccess || null

  if (loading) {
    return (
      <ProtectedLoadingPage title={PS.detail.loading} description={PS.detail.loadingDesc} />
    )
  }

  if (error || !context) {
    return (
      <ProtectedErrorPage
        title={PS.detail.error}
        description={error ? explainApiError({ message: error, status: 500 }, PS.detail.errorDesc) : PS.detail.errorDesc}
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
            eyebrow={PS.header.detailEyebrow}
            title={context.sale.sale_number || PS.table.noCorrelative}
            meta={
              <>
                <OpsStatusBadge tone="accent">{context.sale.document_type.toUpperCase()}</OpsStatusBadge>
                <OpsStatusBadge tone={context.sale.cash_status === "open" ? "success" : context.sale.cash_status === "closed" ? "danger" : "warning"}>
                  {cashStatusLabel(context.sale.cash_status)}
                </OpsStatusBadge>
                <OpsStatusBadge>{`Fecha operativa ${context.sale.business_date}`}</OpsStatusBadge>
              </>
            }
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link href="/postventa">
                    <ArrowLeft className="h-4 w-4" />
                    {PS.detail.back}
                  </Link>
                </Button>
                {has("sales.pos") ? (
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={buildSaleDetailRoute(context.sale.sale_id)}>{PS.detail.viewFullSale}</Link>
                  </Button>
                ) : null}
                {documentPath && has("sales.pos") ? (
                  isProforma ? (
                    <Button asChild variant="accent" size="sm" className="rounded-lg">
                      <a href={documentPath} target="_blank" rel="noreferrer">
                        <ReceiptText className="h-4 w-4" />
                        {PS.detail.openProforma}
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" variant="accent" size="sm" className="rounded-lg" onClick={() => setReceiptModalOpen(true)}>
                      <Download className="h-4 w-4" />
                      {PS.detail.downloadReceipt}
                    </Button>
                  )
                ) : null}
              </>
            }
          />

          {combinedSuccess ? (
            <InlineStatusCard
              title={PS.detail.operationCompleted}
              description={combinedSuccess}
              tone="neutral"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          ) : null}

          {combinedError ? (
            <InlineStatusCard
              title={PS.detail.operationFailed}
              description={combinedError}
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          ) : null}

          {!context.availability.exchange.allowed ? (
            <InlineStatusCard
              title={PS.detail.exchangeBlocked}
              description={context.availability.exchange.reasons.join(" ")}
              tone="warning"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          ) : null}

          {!context.availability.cancel.allowed ? (
            <InlineStatusCard
              title={PS.detail.cancelBlocked}
              description={context.availability.cancel.reasons.join(" ")}
              tone="warning"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="space-y-4">
              <OpsPanelSection
                title={PS.detail.sections.baseSale}
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
                          : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] hover:bg-[var(--ops-surface)]",
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
              </OpsPanelSection>

              {context.exchanges.length > 0 ? (
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
                              {ex.reason || "Sin motivo"} • {formatDateTime(ex.confirmed_at, ex.created_at)}
                            </p>
                          </div>
                          <OpsStatusBadge tone="success">{ex.status}</OpsStatusBadge>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {ex.lines.map((line) => (
                            <div key={line.exchange_line_id} className={INFO_BOX}>
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
                        {ex.notes ? <p className="mt-3 text-sm text-[var(--ops-text-muted)]">{ex.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </OpsPanelSection>
              ) : null}

              {context.cancellation ? (
                <OpsPanelSection title={PS.detail.sections.cancellation} tone="danger">
                  <p className="text-sm text-[var(--ops-tone-danger-text)]">
                    {context.cancellation.reason} • {formatDateTime(context.cancellation.cancelled_at)}
                  </p>
                  {context.cancellation.notes ? (
                    <p className="mt-2 text-sm text-[var(--ops-tone-danger-text)]">{context.cancellation.notes}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-danger-text)]">
                    Ejecutado por {context.cancellation.cancelled_by_name || "Usuario no identificado"}
                  </p>
                </OpsPanelSection>
              ) : null}
            </div>

            <div className="space-y-4">
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
                      {context.sale.customer_doc_type || "-"} {context.sale.customer_doc_number || ""}
                    </p>
                  </div>
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {PS.detail.fields.location}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.location_name}</p>
                  </div>
                  <div className={mutedBlockClass}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {PS.detail.fields.seller}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.seller_name}</p>
                  </div>
                  <div className={cn(mutedBlockClass, "md:col-span-2")}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {PS.detail.fields.address}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">{context.sale.customer_address_text || "-"}</p>
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
                                {PS.detail.payments.reversalMethod} {reversal.method}
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
                    <span>{PS.detail.payments.registered}</span>
                    <span>{formatCurrency(paymentSummary.paymentTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ops-text-muted)]">
                    <span>{PS.detail.payments.reversals}</span>
                    <span>{formatCurrency(paymentSummary.reversalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-[var(--ops-text)]">
                    <span>{PS.detail.payments.net}</span>
                    <span>{formatCurrency(paymentSummary.netTotal)}</span>
                  </div>
                </div>
              </OpsPanelSection>

              {has("sales.postsale.exchange") ? (
                <OpsPanelSection
                  title={PS.detail.sections.simpleExchange}
                  icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
                >
                <form onSubmit={(e) => exchange.handleExchangeSubmit(e, selectedSaleDetailId, replacement.selectedReplacementVariantId)}>

                  {context.availability.exchange.allowed ? (
                    <div className="space-y-4">
                      <OpsFormField
                        label={PS.detail.lines.searchReplacement}
                        error={replacement.replacementError}
                        density="compact"
                      >
                        <input
                          type="text"
                          name="postsale_replacement_search"
                          autoComplete="off"
                          value={replacement.replacementSearch}
                          onChange={(e) => replacement.setReplacementSearch(e.target.value)}
                          placeholder={PS.detail.lines.searchPlaceholder}
                          className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                        />
                      </OpsFormField>

                      {selectedLine ? (
                        <div className={mutedBlockClass}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                            {PS.detail.lines.baseLine}
                          </p>
                          <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                            {selectedLine.style_name} • {selectedLine.quantity} und
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            Total original {formatCurrency(Number(selectedLine.line_total))}
                          </p>
                        </div>
                      ) : null}

                      {replacement.replacementLoading ? (
                        <div className={cn(mutedBlockClass, "py-6 text-center text-sm text-[var(--ops-text-muted)]")}>
                          {PS.detail.lines.searching}
                        </div>
                      ) : replacement.replacementResults.length > 0 ? (
                        <div className="space-y-2">
                          {replacement.replacementResults.map((variant) => {
                            const replacementTotal = selectedLine
                              ? computeCandidateTotal(variant, selectedLine, context.sale.tax_rate)
                              : 0
                            const valueMatches = selectedLine
                              ? round2(replacementTotal) === round2(selectedLine.line_total)
                              : true

                            return (
                              <button
                                key={variant.variant_id}
                                type="button"
                                onClick={() => replacement.setSelectedReplacementVariantId(variant.variant_id)}
                                className={cn(
                                  "block w-full rounded-lg border px-3 py-3 text-left transition",
                                  replacement.selectedReplacementVariantId === variant.variant_id
                                    ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))]"
                                    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] hover:bg-[var(--ops-surface)]",
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
                                    <OpsStatusBadge tone={valueMatches ? "success" : "warning"}>
                                      {valueMatches ? PS.detail.lines.sameValue : `Total ${formatCurrency(replacementTotal)}`}
                                    </OpsStatusBadge>
                                  </div>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      ) : replacement.replacementSearch.trim().length >= 2 ? (
                        <div className={cn(mutedBlockClass, "py-6 text-center text-sm text-[var(--ops-text-muted)]")}>
                          {PS.detail.lines.noMatch}
                        </div>
                      ) : null}

                      {replacement.selectedReplacement ? (
                        <div className="rounded-lg border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-success-text)]">
                            {PS.detail.lines.selectedReplacement}
                          </p>
                          <p className="mt-1 text-sm font-medium text-[var(--ops-text)]">
                            {replacement.selectedReplacement.style_name} • {replacement.selectedReplacement.sku}
                          </p>
                          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                            Precio {formatCurrency(Number(replacement.selectedReplacement.retail_price || 0))}
                          </p>
                        </div>
                      ) : null}

                      <OpsFormField label={PS.detail.lines.reasonRequired} required error={exchange.exchangeReasonError} density="compact">
                        <input
                          type="text"
                          name="postsale_exchange_reason"
                          autoComplete="off"
                          value={exchange.exchangeReason}
                          onChange={(e) => exchange.setExchangeReason(e.target.value)}
                          placeholder={PS.detail.lines.reasonPlaceholder}
                          className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                        />
                      </OpsFormField>

                      <OpsFormField label={PS.detail.lines.notes} density="compact">
                        <textarea
                          name="postsale_exchange_notes"
                          autoComplete="off"
                          value={exchange.exchangeNotes}
                          onChange={(e) => exchange.setExchangeNotes(e.target.value)}
                          rows={3}
                          className="sales-field min-h-[108px] w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                          placeholder={PS.detail.lines.notesExchangePlaceholder}
                        />
                      </OpsFormField>

                      <Button
                        type="submit"
                        variant="accent"
                        size="lg"
                        className="rounded-lg px-4"
                        disabled={
                          exchange.exchangeSubmitting ||
                          !selectedSaleDetailId ||
                          !replacement.selectedReplacementVariantId ||
                          !exchange.exchangeReason.trim()
                        }
                      >
                        {exchange.exchangeSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {PS.detail.buttons.registeringExchange}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            {PS.detail.buttons.registerExchange}
                          </span>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {context.availability.exchange.reasons.join(" ")}
                    </p>
                  )}
                </form>
                </OpsPanelSection>
              ) : null}

              {has("sales.postsale.cancel") ? (
                <OpsPanelSection
                  title={PS.detail.sections.totalCancellation}
                  icon={<Undo2 className="h-4 w-4 text-[var(--ops-text-muted)]" />}
                >
                <form onSubmit={cancel.initiateCancel}>

                  {context.availability.cancel.allowed ? (
                    <div className="space-y-4">
                      <OpsFormField label={PS.detail.lines.reasonRequired} required error={cancel.cancelReasonError} density="compact">
                        <input
                          type="text"
                          name="postsale_cancel_reason"
                          autoComplete="off"
                          value={cancel.cancelReason}
                          onChange={(e) => cancel.setCancelReason(e.target.value)}
                          placeholder={PS.detail.lines.reasonPlaceholderCancel}
                          className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                        />
                      </OpsFormField>

                      <OpsFormField label={PS.detail.lines.notes} density="compact">
                        <textarea
                          name="postsale_cancel_notes"
                          autoComplete="off"
                          value={cancel.cancelNotes}
                          onChange={(e) => cancel.setCancelNotes(e.target.value)}
                          rows={3}
                          className="sales-field min-h-[108px] w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                          placeholder={PS.detail.lines.notesCancelPlaceholder}
                        />
                      </OpsFormField>

                      <Button
                        type="submit"
                        variant="accent"
                        size="lg"
                        className="rounded-lg px-4"
                        disabled={cancel.cancelSubmitting || !cancel.cancelReason.trim()}
                      >
                        {cancel.cancelSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {PS.detail.buttons.cancellingSale}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Undo2 className="h-4 w-4" />
                            {PS.detail.buttons.cancelSale}
                          </span>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {context.availability.cancel.reasons.join(" ")}
                    </p>
                  )}
                </form>
                </OpsPanelSection>
              ) : null}

              {context.sale.notes ? (
                <OpsPanelSection title={PS.detail.sections.originalNotes}>
                  <p className="text-sm text-[var(--ops-text-muted)]">{context.sale.notes}</p>
                </OpsPanelSection>
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
            if (documentPath) window.open(documentPath, "_blank")
          }}
        />

        <OpsDialog
          open={cancel.cancelConfirmOpen}
          onOpenChange={cancel.setCancelConfirmOpen}
          title={PS.detail.confirmCancel.title}
          description={PS.detail.confirmCancel.description}
          size="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => cancel.setCancelConfirmOpen(false)} className="rounded-lg">
                {PS.detail.confirmCancel.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  cancel.setCancelConfirmOpen(false)
                  cancel.executeCancellation()
                }}
                disabled={cancel.cancelSubmitting}
                className="rounded-lg"
              >
                {cancel.cancelSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {PS.detail.confirmCancel.confirming}
                  </span>
                ) : (
                  PS.detail.confirmCancel.confirm
                )}
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
