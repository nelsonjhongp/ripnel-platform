"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import { explainApiError, parseAmountInput, round2, trimOrNull } from "./pos-utils"
import { POS } from "./pos-messages"
import type {
  CartItem,
  ConfirmedSale,
  PosCustomer,
  SaleDiscountState,
} from "./pos-types"
import { createDefaultMixedPayments } from "./pos-utils"

interface UseSaleConfirmationInput {
  cartItems: CartItem[]
  selectedCustomer: PosCustomer | null
  documentType: string
  paymentMode: "single" | "mixed"
  paymentMethod: string
  singleReference: string
  mixedPaymentsPreview: {
    payments: { method: string; amount: number | null; reference: string | null }[]
    error: string | null
  }
  totals: { saleDiscountAmount: number; total: number }
  saleDiscount: SaleDiscountState
  submitDisabled: boolean
  refreshPosContext: () => Promise<void>
  onReset: () => void
  onConfirmed?: () => void
}

export function useSaleConfirmation(input: UseSaleConfirmationInput) {
  const {
    cartItems,
    selectedCustomer,
    documentType,
    paymentMode,
    paymentMethod,
    singleReference,
    mixedPaymentsPreview,
    totals,
    saleDiscount,
    submitDisabled,
    refreshPosContext,
    onReset,
    onConfirmed,
  } = input

  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSale | null>(null)
  const [saleConfirmationOpen, setSaleConfirmationOpen] = useState(false)
  const [saleReviewOpen, setSaleReviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openSaleReview() {
    if (submitDisabled) return
    setSaleReviewOpen(true)
  }

  function closeSaleReview() {
    setSaleReviewOpen(false)
  }

  function startNextSale() {
    onReset()
    setConfirmedSale(null)
    setSaleConfirmationOpen(false)
    setSaleReviewOpen(false)
  }

  async function confirmSale() {
    if (submitDisabled) return
    setSubmitting(true)
    setError(null)
    setSaleReviewOpen(false)

    try {
      const payload: Record<string, unknown> = {
        customer_id: selectedCustomer?.customer_id || null,
        document_type: documentType,
        items: cartItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          ...(item.price_override
            ? {
                price_override: {
                  unit_price_final: item.price_override.unit_price_final,
                  reason: item.price_override.reason,
                },
              }
            : {}),
        })),
      }

      if (totals.saleDiscountAmount > 0) {
        payload.sale_discount = {
          mode: saleDiscount.mode,
          value: parseAmountInput(saleDiscount.value),
          reason: trimOrNull(saleDiscount.reason),
        }
      }

      if (paymentMode === "mixed") {
        payload.payments = mixedPaymentsPreview.payments
      } else {
        payload.payment_method = paymentMethod
        if (trimOrNull(singleReference)) payload.payment_reference = trimOrNull(singleReference)
      }

      const sale = (await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as ConfirmedSale

      setConfirmedSale(sale)
      setSaleConfirmationOpen(true)
      onConfirmed?.()
      await refreshPosContext()
      showSuccess(POS.sale.success, sale.sale_number ? `#${sale.sale_number}` : POS.sale.successDesc)
    } catch (submitError) {
      const message = explainApiError(submitError, POS.toast.saleConfirmError)
      setError(message)
      showError(POS.sale.error, message)
      await refreshPosContext()
    } finally {
      setSubmitting(false)
    }
  }

  function printConfirmedSaleReceipt(saleId: string) {
    window.open(`/api/sales/${saleId}/receipt-pdf`, "_blank")
  }

  return {
    submitting,
    confirmedSale,
    saleConfirmationOpen,
    setSaleConfirmationOpen,
    saleReviewOpen,
    setSaleReviewOpen,
    error,
    confirmSale,
    startNextSale,
    openSaleReview,
    closeSaleReview,
    printConfirmedSaleReceipt,
  }
}
