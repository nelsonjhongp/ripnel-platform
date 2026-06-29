"use client"

import { useCallback, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"
import { showSuccess, showError } from "@/lib/toast"
import { explainApiError } from "@/lib/error-utils"

import type { CurrentCashResponse } from "./cash-types"
import { CAJA } from "./cash-messages"
import {
  buildCloseCashPayload,
  buildOpenCashPayload,
  deriveCashPageState,
} from "./cash-page-logic"

export function useCashPage(
  locationId: string | undefined,
  canOperateCash: boolean,
) {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [openNotes, setOpenNotes] = useState("")
  const [openingBalance, setOpeningBalance] = useState("")
  const [showOpenConfirm, setShowOpenConfirm] = useState(false)
  const [closeNotes, setCloseNotes] = useState("")
  const [closingBalanceDeclared, setClosingBalanceDeclared] = useState("")
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const { data: current, loading, error, refetch } = useApiGet(
    locationId
      ? () =>
          apiFetch<CurrentCashResponse>(
            `/api/cash/current?location_id=${locationId}`,
            { cache: "no-store" },
          )
      : null,
    [locationId],
  )

  const handleOpen = useCallback(async () => {
    if (!locationId || actionLoading || !canOperateCash) return

    setActionLoading(true)
    setActionError(null)

    try {
      await apiFetch("/api/cash/open", {
        method: "POST",
        body: JSON.stringify(
          buildOpenCashPayload({
            locationId,
            openNotes,
            openingBalance,
          }),
        ),
      })
      setShowOpenConfirm(false)
      setOpenNotes("")
      setOpeningBalance("")
      refetch()
      showSuccess(CAJA.toast.openSuccess.title, CAJA.toast.openSuccess.desc)
    } catch (err) {
      const message = explainApiError(err, CAJA.toast.openError.fallback)
      setActionError(message)
      showError(CAJA.toast.openError.title, message)
    } finally {
      setActionLoading(false)
    }
  }, [locationId, actionLoading, canOperateCash, openNotes, openingBalance, refetch])

  const handleClose = useCallback(async () => {
    if (!current?.closing || actionLoading || !canOperateCash) return

    setActionLoading(true)
    setActionError(null)

    try {
      await apiFetch(
        `/api/cash/${current.closing.cash_closing_id}/close`,
        {
          method: "PATCH",
          body: JSON.stringify(
            buildCloseCashPayload({
              closeNotes,
              closingBalanceDeclared,
            }),
          ),
        },
      )
      setShowCloseConfirm(false)
      setCloseNotes("")
      setClosingBalanceDeclared("")
      refetch()
      showSuccess(CAJA.toast.closeSuccess.title, CAJA.toast.closeSuccess.desc)
    } catch (err) {
      const message = explainApiError(err, CAJA.toast.closeError.fallback)
      setActionError(message)
      showError(CAJA.toast.closeError.title, message)
    } finally {
      setActionLoading(false)
    }
  }, [current, actionLoading, canOperateCash, closeNotes, closingBalanceDeclared, refetch])

  const {
    isClosed,
    isOpen,
    summary,
    consistencyOk,
    cashStatusMeta,
    bannerState,
    methodValues,
    grandTotal,
    saleCount,
    paymentTotal,
    closeSummaryTotal,
    closeWarningMessage,
    businessDate,
    closing,
    declaredBalance,
    balanceDifference,
    balanceDiffLabel,
  } = useMemo(() => deriveCashPageState(current), [current])

  return {
    actionLoading,
    actionError,
    setActionError,
    openNotes,
    setOpenNotes,
    openingBalance,
    setOpeningBalance,
    showOpenConfirm,
    setShowOpenConfirm,
    closeNotes,
    setCloseNotes,
    closingBalanceDeclared,
    setClosingBalanceDeclared,
    showCloseConfirm,
    setShowCloseConfirm,
    current,
    loading,
    error,
    refetch,
    handleOpen,
    handleClose,
    isClosed,
    isOpen,
    summary,
    consistencyOk,
    cashStatusMeta,
    bannerState,
    methodValues,
    grandTotal,
    saleCount,
    paymentTotal,
    closeSummaryTotal,
    closeWarningMessage,
    businessDate,
    closing,
    declaredBalance,
    balanceDifference,
    balanceDiffLabel,
  }
}
