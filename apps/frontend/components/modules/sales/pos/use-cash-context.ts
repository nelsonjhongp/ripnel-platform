"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import type { PosContext } from "./pos-types"
import { explainApiError } from "./pos-utils"

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
        explainApiError(fetchError, "No se pudo validar la caja operativa."),
      )
    } finally {
      setPosContextLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    void Promise.resolve().then(() => refreshPosContext())
  }, [refreshPosContext])

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
      showSuccess("Caja abierta", "Ventas habilitadas para la sede.")
    } catch (openError) {
      showError("No se pudo abrir caja", explainApiError(openError, "Intenta nuevamente."))
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
      showSuccess("Caja reabierta", "Ventas habilitadas nuevamente.")
    } catch (reopenError) {
      showError("No se pudo reabrir caja", explainApiError(reopenError, "Intenta nuevamente."))
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
