"use client"

import { CreditCard, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatMoney } from "@/lib/format-utils"
import { buildSemanticChipClass, getPaymentReferenceMeta } from "./pos-utils"
import { renderPaymentMethodIcon } from "./pos-icons"
import { INPUT_CLASS } from "./pos-constants"
import { PAYMENT_METHODS } from "./pos-types"
import type { PaymentStageProps } from "./pos-stage-props"

export function PaymentStage(props: PaymentStageProps) {
  const {
    active,
    activeDocumentOption,
    cartCount,
    totals,
    saleDiscountError,
    setDiscountModalOpen,
    paymentMode, setPaymentModeWithDefaults,
    paymentMethod, setPaymentMethod,
    mixedPayments, mixedPaymentsPreview,
    updateMixedPaymentDraft, addMixedPaymentDraft, removeMixedPaymentDraft,
    onActivate,
  } = props

  return (
    <section
      onMouseEnter={() => onActivate()}
      className={`relative z-0 space-y-3 xl:order-4 xl:col-span-2 ${
        active ? "" : "hidden"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-[var(--ripnel-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--ops-text)]">
            Cobro
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="sales-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
            {cartCount} item{cartCount === 1 ? "" : "s"}
          </span>
          <span className="sales-chip sales-chip-success rounded-full px-2.5 py-1 text-[11px] font-semibold">
            {activeDocumentOption?.label}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {cartCount > 0 ? (
          <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    Ajustes comerciales
                  </p>
                  <OpsStatusBadge
                    tone={
                      totals.saleDiscountAmount > 0
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {totals.saleDiscountAmount > 0
                      ? `Descuento actual S/. ${formatMoney(totals.saleDiscountAmount)}`
                      : "Sin descuento"}
                  </OpsStatusBadge>
                </div>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  El descuento afecta el total del documento y
                  se traza por separado.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDiscountModalOpen(true)}
                className="rounded-lg"
              >
                Ajustar descuento
              </Button>
            </div>

            {saleDiscountError ? (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}
              >
                {saleDiscountError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="border-y border-[var(--ops-border-strong)] py-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              Metodo de pago
            </p>
            <div className="inline-flex rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-1">
              <button
                type="button"
                onClick={() =>
                  setPaymentModeWithDefaults("single")
                }
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  paymentMode === "single"
                    ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                    : "text-[var(--ops-text-muted)]"
                }`}
              >
                Pago unico
              </button>
              <button
                type="button"
                onClick={() =>
                  setPaymentModeWithDefaults("mixed")
                }
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  paymentMode === "mixed"
                    ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                    : "text-[var(--ops-text-muted)]"
                }`}
              >
                Pago mixto
              </button>
            </div>
          </div>
          {paymentMode === "single" ? (
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const selected =
                  paymentMethod === method.value;

                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() =>
                      setPaymentMethod(method.value)
                    }
                    className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition ${
                      selected
                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)]"
                        : "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {renderPaymentMethodIcon(
                        method.value,
                        "h-4 w-4",
                      )}
                      <span>{method.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : mixedPaymentsPreview ? (
            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <OpsStatusBadge
                  tone={
                    Math.abs(
                      mixedPaymentsPreview.difference,
                    ) < 0.01
                      ? "success"
                      : mixedPaymentsPreview.difference < 0
                        ? "danger"
                        : "warning"
                  }
                >
                  {Math.abs(mixedPaymentsPreview.difference) <
                  0.01
                    ? "Pago cuadrado"
                    : mixedPaymentsPreview.difference > 0
                      ? `Faltan S/. ${formatMoney(mixedPaymentsPreview.difference)}`
                        : `Excede S/. ${formatMoney(Math.abs(mixedPaymentsPreview.difference))}`}
                </OpsStatusBadge>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={addMixedPaymentDraft}
                  className="rounded-lg"
                >
                  Agregar linea
                </Button>
              </div>

              <div className="divide-y divide-[var(--ops-border-strong)]">
                {mixedPayments.map((payment, index) => {
                  const paymentReferenceMeta =
                    getPaymentReferenceMeta(payment.method);

                  return (
                    <div
                      key={payment.id}
                      className="grid gap-2 py-3 md:grid-cols-[minmax(0,0.9fr)_112px_minmax(0,1fr)_auto] md:items-end"
                    >
                      <div>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="sales-chip sales-chip-accent rounded-full px-2 text-[11px] font-semibold">
                            {index + 1}
                          </span>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                            Linea de pago
                          </p>
                        </div>
                        <select
                          value={payment.method}
                          onChange={(event) =>
                            updateMixedPaymentDraft(
                              payment.id,
                              "method",
                              event.target.value,
                            )
                          }
                          className={INPUT_CLASS}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option
                              key={method.value}
                              value={method.value}
                            >
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Monto
                        </label>
                        <input
                          value={payment.amount}
                          onChange={(event) =>
                            updateMixedPaymentDraft(
                              payment.id,
                              "amountValue",
                              event.target.value,
                            )
                          }
                          placeholder="0.00"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center gap-1.5">
                          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
                            {paymentReferenceMeta.label}
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-0.5 text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface)] hover:text-[var(--ops-text)]"
                                aria-label={`Informacion de ${paymentReferenceMeta.label.toLowerCase()}`}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={8}
                            >
                              {paymentReferenceMeta.helper}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <input
                          value={payment.reference}
                          onChange={(event) =>
                            updateMixedPaymentDraft(
                              payment.id,
                              "reference",
                              event.target.value,
                            )
                          }
                          placeholder={
                            paymentReferenceMeta.placeholder
                          }
                          className={`${INPUT_CLASS} ${
                            payment.method === "cash"
                              ? "bg-[var(--ops-surface-muted)]"
                              : ""
                          }`}
                        />
                      </div>

                      <div className="flex md:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            removeMixedPaymentDraft(
                              payment.id,
                            )
                          }
                          className="cursor-pointer rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={mixedPayments.length <= 2}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[var(--ops-text-muted)]">
                  Asignado: S/.{" "}
                  {formatMoney(
                    mixedPaymentsPreview.enteredTotal,
                  )}
                </span>
                <span className="font-semibold text-[var(--ops-text)]">
                  Total: S/. {formatMoney(totals.total)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
