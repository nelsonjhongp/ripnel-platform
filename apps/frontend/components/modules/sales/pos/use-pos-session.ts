"use client"

import { useRef } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { useCashContext } from "./use-cash-context"

export function usePosSession() {
  const { defaultLocation, locationsLoading, has } = useAuth()

  const customerSectionRef = useRef<HTMLElement | null>(null)
  const productSectionRef = useRef<HTMLElement | null>(null)
  const paymentSectionRef = useRef<HTMLElement | null>(null)
  const productSearchInputRef = useRef<HTMLInputElement | null>(null)
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null)

  const cash = useCashContext(defaultLocation?.location_id, has)

  return {
    defaultLocation,
    locationsLoading,
    has,
    refs: {
      customerSectionRef,
      productSectionRef,
      paymentSectionRef,
      productSearchInputRef,
      customerSearchInputRef,
    },
    posContext: cash.posContext,
    posContextLoading: cash.posContextLoading,
    posContextError: cash.posContextError,
    cashReady: cash.cashReady,
    cashStatus: cash.cashStatus,
    canOpenCashModule: cash.canOpenCashModule,
    canReopenCash: cash.canReopenCash,
    refreshPosContext: cash.refreshPosContext,
    cashOpenDialogOpen: cash.cashOpenDialogOpen,
    setCashOpenDialogOpen: cash.setCashOpenDialogOpen,
    openingCash: cash.openingCash,
    reopenCashDialogOpen: cash.reopenCashDialogOpen,
    setReopenCashDialogOpen: cash.setReopenCashDialogOpen,
    reopenNotes: cash.reopenNotes,
    setReopenNotes: cash.setReopenNotes,
    reopeningCash: cash.reopeningCash,
    handleOpenCash: cash.handleOpenCash,
    handleReopenCash: cash.handleReopenCash,
  }
}