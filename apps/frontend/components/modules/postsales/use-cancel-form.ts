"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { type PostsaleContext } from "@/types/postsales"
import { PS } from "./postsales-messages"

export function useCancelForm(saleId: string | null, refetch: () => void) {
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function resetForm() {
    setReason("")
    setReasonError(null)
    setNotes("")
  }

  function initiateCancel(event: React.FormEvent) {
    event.preventDefault()
    if (!saleId) return
    if (!reason.trim()) {
      setReasonError(PS.detail.alerts.reasonValidation)
      return
    }
    setReasonError(null)
    setConfirmOpen(true)
  }

  async function executeCancellation() {
    if (!saleId) return

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      await apiFetch<PostsaleContext>(`/api/postsales/${saleId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, notes }),
      })

      refetch()
      setSuccess(PS.detail.alerts.cancelSuccess)
      resetForm()
    } catch (submitError) {
      setError(explainApiError(submitError, PS.detail.alerts.operationFallback))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    cancelReason: reason,
    setCancelReason: (value: string) => {
      setReason(value)
      setReasonError(null)
    },
    cancelReasonError: reasonError,
    cancelNotes: notes,
    setCancelNotes: setNotes,
    cancelError: error,
    cancelSuccess: success,
    cancelSubmitting: submitting,
    cancelConfirmOpen: confirmOpen,
    setCancelConfirmOpen: setConfirmOpen,
    initiateCancel,
    executeCancellation,
    cancelResetForm: resetForm,
  }
}
