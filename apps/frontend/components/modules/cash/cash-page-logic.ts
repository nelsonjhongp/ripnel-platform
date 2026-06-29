"use client"

import type { CurrentCashResponse } from "./cash-types"
import { CAJA } from "./cash-messages"
import { formatAmount, formatBusinessDate } from "./cash-utils"

type OpenCashPayloadInput = {
  locationId: string
  openNotes: string
  openingBalance: string
}

type CloseCashPayloadInput = {
  closeNotes: string
  closingBalanceDeclared: string
}

export function buildOpenCashPayload({
  locationId,
  openNotes,
  openingBalance,
}: OpenCashPayloadInput) {
  const payload: {
    location_id: string
    notes?: string
    opening_balance?: number
  } = {
    location_id: locationId,
  }

  const normalizedNotes = openNotes.trim()
  if (normalizedNotes) {
    payload.notes = normalizedNotes
  }

  if (openingBalance) {
    payload.opening_balance = parseFloat(openingBalance)
  }

  return payload
}

export function buildCloseCashPayload({
  closeNotes,
  closingBalanceDeclared,
}: CloseCashPayloadInput) {
  const payload: {
    notes?: string
    closing_balance_declared?: number
  } = {}

  if (closeNotes) {
    payload.notes = closeNotes
  }

  if (closingBalanceDeclared) {
    payload.closing_balance_declared = parseFloat(closingBalanceDeclared)
  }

  return payload
}

export function deriveCashPageState(current: CurrentCashResponse | null) {
  const isClosed = current?.closing?.status === "closed"
  const isOpen = current?.closing?.status === "open"
  const summary = current?.sales_summary ?? null
  const businessDate = current?.business_date ?? null
  const consistencyOk = summary?.consistency.is_consistent ?? true

  const cashStatusMeta = businessDate
    ? {
        text: formatBusinessDate(businessDate),
        tooltip: CAJA.status.businessDateTooltip,
      }
    : null

  const bannerState = isOpen
    ? {
        kind: "open" as const,
        openedByName: current?.closing?.opened_by_name ?? null,
      }
    : isClosed
      ? {
          kind: "closed" as const,
          closedByName: current?.closing?.closed_by_name ?? null,
        }
      : { kind: "not-open" as const }

  const methodValues = summary
    ? {
        cash: formatAmount(summary.by_method.cash),
        yape: formatAmount(summary.by_method.yape),
        plin: formatAmount(summary.by_method.plin),
        transfer: formatAmount(summary.by_method.transfer),
      }
    : null

  const grandTotal = summary ? formatAmount(summary.grand_total) : null
  const saleCount = summary ? summary.sale_count : null
  const paymentTotal = summary
    ? formatAmount(summary.consistency.payment_total)
    : null
  const closeSummaryTotal = paymentTotal
  const closeWarningMessage =
    summary && !consistencyOk
      ? CAJA.closeDialog.consistencyWarning
      : null

  const closing = current?.closing ?? null
  const declaredBalance = closing?.closing_balance_declared ?? null
  const balanceDifference =
    closing && declaredBalance != null ? declaredBalance - closing.total_all : null

  const balanceDiffLabel =
    balanceDifference == null
      ? null
      : {
          label:
            balanceDifference >= 0
              ? CAJA.summary.surplus
              : CAJA.summary.shortage,
          value: formatAmount(Math.abs(balanceDifference)),
          tone: (balanceDifference >= 0 ? undefined : "warning") as
            | "warning"
            | undefined,
        }

  return {
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
