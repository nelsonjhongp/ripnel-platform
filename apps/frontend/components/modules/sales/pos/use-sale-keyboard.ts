"use client"

import { useState } from "react"
import type { RefObject } from "react"
import type { Stage } from "./pos-types"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut"

interface UseSaleKeyboardInput {
  productSearchInputRef: RefObject<HTMLInputElement | null>
  customerSearchInputRef: RefObject<HTMLInputElement | null>
  productSectionRef: RefObject<HTMLElement | null>
  customerSectionRef: RefObject<HTMLElement | null>
  paymentSectionRef: RefObject<HTMLElement | null>
  submitDisabled: boolean
  submitting: boolean
  onReviewSale: () => void
  onCloseProductPicker: () => void
  onCloseCustomerPicker: () => void
}

export function useSaleKeyboard(input: UseSaleKeyboardInput) {
  const {
    productSearchInputRef,
    customerSearchInputRef,
    productSectionRef,
    customerSectionRef,
    paymentSectionRef,
    submitDisabled,
    submitting,
    onReviewSale,
    onCloseProductPicker,
    onCloseCustomerPicker,
  } = input

  const [pulseStage, setPulseStage] = useState<Stage | null>(null)

  const busy = submitting

  useKeyboardShortcuts([
    {
      key: "F2",
      handler: () => productSearchInputRef.current?.focus(),
      enabled: !busy,
    },
    {
      key: "F4",
      handler: () => customerSearchInputRef.current?.focus(),
      enabled: !busy,
    },
    {
      key: "F8",
      handler: () => {
        if (!submitDisabled) onReviewSale()
      },
      enabled: !busy,
    },
    {
      key: "Escape",
      handler: () => {
        onCloseProductPicker()
        onCloseCustomerPicker()
      },
      enabled: true,
    },
  ])

  function pulse(stage: Stage) {
    setPulseStage(stage)
    window.setTimeout(() => setPulseStage(null), 850)
  }

  function goToStage(stage: Stage) {
    pulse(stage)
    const ref =
      stage === "products"
        ? productSectionRef
        : stage === "customer"
          ? customerSectionRef
          : paymentSectionRef
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      ref.current?.focus?.()
    })
  }

  return {
    pulseStage,
    goToStage,
  }
}
