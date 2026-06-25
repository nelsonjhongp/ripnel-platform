"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import type { PosContext } from "./pos-types"
import { explainApiError } from "./pos-utils"
import { POS } from "./pos-messages"

export function useCashContext(
  locationId: string | undefined,
  has: (perm: string) => boolean,
) {
  const [posContext, setPosContext] = useState<PosContext | null>(null)
  const [posContextLoading, setPosContextLoading] = useState(false)
  const [posContextError, setPosContextError] = useState<string | null>(null)
  const [cashOpenDialogOpen, setCashOpenDialogOpen] = useState(false)
  const [openingCash, setOpeningCash] = useState(false)
  const [reopenCashDialogOpen, setReopenCashDialogOpen] = useState(false)
  const [reopenNotes, setReopenNotes] = useState("")
  const [reopeningCash, setReopeningCash] = useState(false)
  const [initialCashCheckDone, setInitialCashCheckDone] = useState(false)

  const refreshPosContext = useCallback(async () => {
    if (!locationId) {
      setPosContext(null)
      setPosContextError(null)
      return
    }

    setPosContextLoading(true)
    setPosContextError(null)

    try {
      const context = (await apiFetch("/api/sales/context", {
        cache: "no-store",
      })) as PosContext
      setPosContext(context)
    } catch (fetchError) {
      setPosContext(null)
      setPosContextError(
        explainApiError(fetchError, POS.toast.cashContextError),
      )
    } finally {
      setPosContextLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    void Promise.resolve().then(() => refreshPosContext())
  }, [refreshPosContext])

  useEffect(() => {
    if (initialCashCheckDone || posContextLoading || !posContext) return
    setInitialCashCheckDone(true)
    const status = posContext?.cash?.status || "missing"
    if (status === "missing" && has("cash.operate")) {
      setCashOpenDialogOpen(true)
    }
  }, [posContextLoading, posContext, initialCashCheckDone, has])

  const cashReady = posContext?.cash?.sale_enabled === true
  const cashStatus = posContext?.cash?.status || "missing"
  const canOpenCashModule = has("cash.operate")
  const canReopenCash = has("cash.admin.reopen")

  async function handleOpenCash() {
    if (!locationId) return
    setOpeningCash(true)
    try {
      await apiFetch("/api/cash/open", {
        method: "POST",
        body: JSON.stringify({
          location_id: locationId,
          business_date: posContext?.business_date,
        }),
      })
      setCashOpenDialogOpen(false)
      await refreshPosContext()
      showSuccess(POS.cash.openSuccessTitle, POS.cash.openSuccessDesc)
    } catch (openError) {
      showError(POS.cash.openErrorTitle, explainApiError(openError, POS.toast.cashOpenRetry))
    } finally {
      setOpeningCash(false)
    }
  }

  async function handleReopenCash() {
    const cashClosingId = posContext?.cash?.cash_closing_id
    if (!cashClosingId || !reopenNotes.trim()) return
    setReopeningCash(true)
    try {
      await apiFetch(`/api/cash/${cashClosingId}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({ reopen_notes: reopenNotes.trim() }),
      })
      setReopenCashDialogOpen(false)
      setReopenNotes("")
      await refreshPosContext()
      showSuccess(POS.cash.reopenSuccessTitle, POS.cash.reopenSuccessDesc)
    } catch (reopenError) {
      showError(POS.cash.reopenErrorTitle, explainApiError(reopenError, POS.toast.cashOpenRetry))
    } finally {
      setReopeningCash(false)
    }
  }

  return {
    posContext,
    posContextLoading,
    posContextError,
    cashReady,
    cashStatus,
    canOpenCashModule,
    canReopenCash,
    refreshPosContext,
    cashOpenDialogOpen,
    setCashOpenDialogOpen,
    openingCash,
    reopenCashDialogOpen,
    setReopenCashDialogOpen,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    handleOpenCash,
    handleReopenCash,
  }
}
