"use client"

import { useCallback, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"
import { showSuccess, showError } from "@/lib/toast"
import { explainApiError } from "@/lib/error-utils"

import type { CurrentCashResponse } from "./cash-types"
import { formatAmount, formatBusinessDate } from "./cash-utils"
import { CAJA } from "./cash-messages"

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
        body: JSON.stringify({
          location_id: locationId,
          notes: openNotes.trim() || undefined,
          opening_balance: openingBalance
            ? parseFloat(openingBalance)
            : undefined,
        }),
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
          body: JSON.stringify({
            notes: closeNotes || undefined,
            closing_balance_declared: closingBalanceDeclared
              ? parseFloat(closingBalanceDeclared)
              : undefined,
          }),
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

  const isClosed = current?.closing?.status === "closed"
  const isOpen = current?.closing?.status === "open"
  const summary = current?.sales_summary
  const businessDate = current?.business_date
  const consistencyOk = summary?.consistency.is_consistent ?? true

  const cashStatusMeta = useMemo(() => {
    if (!businessDate) return null
    return {
      text: formatBusinessDate(businessDate),
      tooltip: CAJA.status.businessDateTooltip,
    }
  }, [businessDate])

  const bannerState = useMemo(() => {
    if (isOpen) {
      return {
        kind: "open" as const,
        openedByName: current?.closing?.opened_by_name ?? null,
      }
    }
    if (isClosed) {
      return {
        kind: "closed" as const,
        closedByName: current?.closing?.closed_by_name ?? null,
      }
    }
    return { kind: "not-open" as const }
  }, [isOpen, isClosed, current])

  const methodValues = useMemo(() => {
    if (!summary) return null
    return {
      cash: formatAmount(summary.by_method.cash),
      yape: formatAmount(summary.by_method.yape),
      plin: formatAmount(summary.by_method.plin),
      transfer: formatAmount(summary.by_method.transfer),
    }
  }, [summary])

  const grandTotal = summary ? formatAmount(summary.grand_total) : null
  const saleCount = summary ? summary.sale_count : null
  const paymentTotal = summary ? formatAmount(summary.consistency.payment_total) : null

  const closing = current?.closing
  const declaredBalance = closing?.closing_balance_declared ?? null
  const balanceDifference =
    declaredBalance != null ? closing!.total_all - declaredBalance : null

  const balanceDiffLabel = useMemo(() => {
    if (balanceDifference == null) return null
    return {
      label:
        balanceDifference >= 0
          ? CAJA.summary.surplus
          : CAJA.summary.shortage,
      value: formatAmount(Math.abs(balanceDifference)),
      tone: (balanceDifference >= 0 ? undefined : "warning") as
        | "warning"
        | undefined,
    }
  }, [balanceDifference])

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
    businessDate,
    closing,
    declaredBalance,
    balanceDifference,
    balanceDiffLabel,
  }
}
