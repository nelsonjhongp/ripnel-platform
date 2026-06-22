"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { type PostsaleContext } from "@/types/postsales"
import { PS } from "./postsales-messages"

export function useExchangeForm(saleId: string | null, refetch: () => void) {
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function clearErrors() {
    setError(null)
    setSuccess(null)
  }

  function resetForm() {
    setReason("")
    setReasonError(null)
    setNotes("")
  }

  async function handleSubmit(
    event: React.FormEvent,
    selectedSaleDetailId: string,
    selectedReplacementVariantId: string,
  ) {
    event.preventDefault()

    if (!saleId || !selectedSaleDetailId || !selectedReplacementVariantId) {
      setError(PS.detail.exchangeBlockedMsg)
      return
    }

    if (!reason.trim()) {
      setReasonError(PS.detail.reasonValidation)
      return
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/exchanges`, {
        method: "POST",
        body: JSON.stringify({
          sale_detail_id: selectedSaleDetailId,
          replacement_variant_id: selectedReplacementVariantId,
          reason,
          notes,
        }),
      })

      refetch()
      setSuccess(PS.detail.exchangeSuccess)
      resetForm()
    } catch (submitError) {
      setError(explainApiError(submitError, PS.detail.operationFallback))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    exchangeReason: reason,
    setExchangeReason: (value: string) => {
      setReason(value)
      setReasonError(null)
    },
    exchangeReasonError: reasonError,
    exchangeNotes: notes,
    setExchangeNotes: setNotes,
    exchangeError: error,
    exchangeSuccess: success,
    exchangeSubmitting: submitting,
    handleExchangeSubmit: handleSubmit,
    clearExchangeErrors: clearErrors,
    exchangeResetForm: resetForm,
  }
}
