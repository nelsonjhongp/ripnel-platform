"use client"

import { useEffect, useState } from "react"
import type { PaymentDraft, SaleDiscountState } from "./pos-types"
import { createDefaultMixedPayments } from "./pos-utils"

export function usePaymentState() {
  const [documentType, setDocumentType] = useState("none")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMode, setPaymentMode] = useState<"single" | "mixed">("single")
  const [singleReference, setSingleReference] = useState("")
  const [mixedPayments, setMixedPayments] = useState<PaymentDraft[]>(() =>
    createDefaultMixedPayments(0, ""),
  )
  const [saleDiscount, setSaleDiscount] = useState<SaleDiscountState>({
    mode: "none",
    value: "",
    reason: "",
  })
  const [discountModalOpen, setDiscountModalOpen] = useState(false)

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      void Promise.resolve().then(() =>
        setMixedPayments(createDefaultMixedPayments(0, paymentMethod)),
      )
    }
  }, [mixedPayments.length, paymentMethod, paymentMode])

  return {
    documentType,
    setDocumentType,
    paymentMethod,
    setPaymentMethod,
    paymentMode,
    setPaymentMode,
    singleReference,
    setSingleReference,
    mixedPayments,
    setMixedPayments,
    saleDiscount,
    setSaleDiscount,
    discountModalOpen,
    setDiscountModalOpen,
  }
}
