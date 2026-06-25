"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { PS } from "./postsales-messages"

interface ExchangeSubmitParams {
  saleId: string
  saleDetailId: string
  replacementVariantId: string
  quantity: number
  paymentMethod?: string
  paymentReference?: string
}

export function useExchangeForm(onSuccess: () => void) {
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function clearErrors() {
    setError(null)
    setReasonError(null)
  }

  function resetForm() {
    setReason("")
    setReasonError(null)
    setNotes("")
    setError(null)
  }

  async function handleSubmit({
    saleId,
    saleDetailId,
    replacementVariantId,
    quantity,
    paymentMethod,
    paymentReference,
  }: ExchangeSubmitParams): Promise<boolean> {
    if (!saleId || !saleDetailId || !replacementVariantId) {
      setError(PS.exchangeDialog.blockValidation)
      return false
    }

    if (!reason.trim()) {
      setReasonError(PS.detail.alerts.reasonValidation)
      return false
    }

    setError(null)
    setReasonError(null)
    setSubmitting(true)

    try {
      await apiFetch(`/api/postsales/${saleId}/exchanges`, {
        method: "POST",
        body: JSON.stringify({
          sale_detail_id: saleDetailId,
          replacement_variant_id: replacementVariantId,
          quantity,
          payment_method: paymentMethod || undefined,
          payment_reference: paymentReference || null,
          reason,
          notes,
        }),
      })
      onSuccess()
      return true
    } catch (submitError) {
      setError(explainApiError(submitError, PS.exchangeDialog.errorFallback))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return {
    reason,
    setReason: (value: string) => {
      setReason(value)
      setReasonError(null)
    },
    reasonError,
    notes,
    setNotes,
    error,
    submitting,
    handleSubmit,
    clearErrors,
    resetForm,
  }
}
