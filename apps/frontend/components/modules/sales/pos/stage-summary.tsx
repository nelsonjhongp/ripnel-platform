"use client"

import Link from "next/link"
import {
  Check,
  CreditCard,
  LoaderCircle,
  PencilLine,
  Receipt,
  ShieldAlert,
  ShoppingBasket,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import {
  formatMoney,
  buildSemanticChipClass,
  buildCashLabel,
  getPaymentMethodLabel,
  trimOrNull,
  parseAmountInput,
} from "./pos-utils"
import { renderPaymentMethodIcon } from "./pos-icons"
import type { SummaryStageProps } from "./pos-stage-props"

export function SummaryStage(props: SummaryStageProps) {
  const {
    active,
    activeDocumentOption,
    selectedCustomerName,
    selectedCustomerDocument,
    cartCount,
    totals,
    paymentMode,
    paymentSummaryLabel,
    mixedPaymentsPreview,
    mixedPayments,
    cashReady,
    cashStatus,
    canOpenCashModule,
    summaryStatusMessage,
    submitDisabled,
    submitting,
    error,
    goToStage,
    confirmSale,
  } = props

  return (
    <>
      <article
        className={`sales-panel rounded-xl p-4 shadow-sm xl:order-5 ${
          active ? "" : "hidden"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="sales-chip sales-chip-accent rounded-full px-2.5 py-1 text-sm font-semibold">
              <Receipt className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                Resumen de venta
              </h2>
            </div>
          </div>

          <OpsStatusBadge
            tone={submitDisabled ? "warning" : "success"}
            className="px-3 text-xs"
          >
            {submitDisabled
              ? "Pendiente por validar"
              : "Listo para finalizar"}
          </OpsStatusBadge>
        </div>

        <div className="mt-4 space-y-3">
          <section className="border-y border-[var(--ops-border-strong)] py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--ripnel-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                  Cliente
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStage("customer")}
                className="rounded-lg"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Comprobante
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  {activeDocumentOption?.label ?? "Documento"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Cliente
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  {selectedCustomerName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Documento
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  {selectedCustomerDocument}
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-[var(--ops-border-strong)] pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="h-4 w-4 text-[var(--ripnel-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                  Productos ({cartCount})
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStage("products")}
                className="rounded-lg"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="min-w-[640px] border-y border-[var(--ops-border-strong)]">
                <div className="hidden bg-[var(--ops-surface-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] md:grid md:grid-cols-[minmax(0,1.5fr)_120px_90px_120px] md:gap-4">
                  <span>Producto</span>
                  <span>Variacion</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">Subtotal</span>
                </div>
                <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {totals.items.map((item) => (
                    <div
                      key={item.variant_id}
                      className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.5fr)_120px_90px_120px] md:items-center md:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ops-text)]">
                          {item.style_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                          {item.sku}
                        </p>
                      </div>
                      <p className="text-[var(--ops-text-muted)]">
                        {item.color_name || item.color_code} /{" "}
                        {item.size_name || item.size_code}
                      </p>
                      <p className="text-center font-medium text-[var(--ops-text)]">
                        {item.quantity}
                      </p>
                      <p className="text-left font-semibold text-[var(--ops-text)] md:text-right">
                        S/.{" "}
                        {formatMoney(
                          item.line_subtotal_before_discount,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[var(--ops-border-strong)] pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                  Cobro
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goToStage("payment")}
                className="rounded-lg"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Modalidad
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  {paymentMode === "mixed"
                    ? "Pago mixto"
                    : "Pago unico"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Medio principal
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  {paymentSummaryLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Cobro asignado
                </p>
                <p className="mt-1 font-medium text-[var(--ops-text)]">
                  S/.{" "}
                  {formatMoney(
                    paymentMode === "mixed" && mixedPaymentsPreview
                      ? mixedPaymentsPreview.enteredTotal
                      : totals.total,
                  )}
                </p>
              </div>
            </div>

            {paymentMode === "mixed" ? (
              <div className="mt-3 divide-y divide-[var(--ops-border-strong)] border-y border-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {mixedPayments.map((payment) => {
                  return (
                    <div
                      key={payment.id}
                      className="grid gap-2 px-3 py-2.5 text-sm md:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)] md:items-center"
                    >
                      <div className="flex items-center gap-2 font-medium text-[var(--ops-text)]">
                        {renderPaymentMethodIcon(
                          payment.method,
                          "h-4 w-4 text-[var(--ripnel-accent)]",
                        )}
                        {getPaymentMethodLabel(payment.method)}
                      </div>
                      <span className="font-medium text-[var(--ops-text)]">
                        S/.{" "}
                        {formatMoney(
                          parseAmountInput(payment.amount) || 0,
                        )}
                      </span>
                      <span className="truncate text-[var(--ops-text-muted)]">
                        {trimOrNull(payment.reference) ||
                          "Sin referencia"}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </section>
        </div>
      </article>

      <article
        className={`sales-panel rounded-xl p-4 shadow-sm xl:order-6 xl:sticky xl:top-20 xl:self-start ${
          active ? "" : "hidden"
        }`}
      >
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[var(--ripnel-accent)]" />
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Totales
          </h2>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div
            className={`rounded-lg border px-3 py-2 ${
              cashReady
                ? buildSemanticChipClass("success")
                : buildSemanticChipClass("warning")
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                Estado de caja:{" "}
                {cashReady
                  ? "Abierta"
                  : buildCashLabel(cashStatus)}
              </span>
              {!cashReady ? (
                canOpenCashModule ? (
                  <Link
                    href="/caja"
                    className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    Ir a Caja del dia
                  </Link>
                ) : (
                  <span className="text-xs">
                    Solicita apertura a caja/admin.
                  </span>
                )
              ) : null}
            </div>
          </div>

          <div className="flex justify-between text-[var(--ops-text-muted)]">
            <span>Subtotal base</span>
            <span>S/. {formatMoney(totals.baseSubtotal)}</span>
          </div>
          {totals.saleDiscountAmount > 0 ? (
            <div className="flex justify-between text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
              <span>Descuento general</span>
              <span>
                - S/. {formatMoney(totals.saleDiscountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-base font-bold text-[var(--ops-text)]">
            <span>Total documento</span>
            <span>S/. {formatMoney(totals.total)}</span>
          </div>
          {totals.taxRate > 0 ? (
            <div className="flex justify-between text-[var(--ops-text-muted)]">
              <span>
                IGV incluido (
                {(totals.taxRate * 100).toFixed(0)}%)
              </span>
              <span>S/. {formatMoney(totals.tax)}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <div className="sales-panel-muted rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Cobro asignado
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
              S/.{" "}
              {formatMoney(
                paymentMode === "mixed" && mixedPaymentsPreview
                  ? mixedPaymentsPreview.enteredTotal
                  : totals.total,
              )}
            </p>
          </div>
          <div className="sales-panel-muted rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Estado
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                submitDisabled
                  ? "text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
                  : "text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
              }`}
            >
              {summaryStatusMessage}
            </p>
          </div>
        </div>

        {totals.hasMissingPrice ? (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}
          >
            Hay items sin precio vigente. Ajustalos antes del
            cierre.
          </p>
        ) : null}

        {error ? (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("danger")}`}
          >
            <ShieldAlert className="mr-1.5 inline h-4 w-4" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={confirmSale}
          disabled={submitDisabled}
          className="mt-4 w-full cursor-pointer rounded-lg bg-[var(--ripnel-accent)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Procesando...
            </span>
          ) : (
            <><Check className="mr-1.5 inline h-4 w-4" /> Finalizar venta</>
          )}
        </button>
      </article>
    </>
  )
}
