import type {
  PaymentDraft,
  PosPricingConfig,
  PriceModeOverride,
  EffectivePriceMode,
  CartItem,
} from "./pos-types"
import { PAYMENT_METHODS } from "./pos-types"
import { POS } from "./pos-messages"
import { CHIP_TONE_ACCENT, CHIP_TONE_NEUTRAL } from "./pos-constants"

import { round2, formatMoney } from "@/lib/format-utils"
export { round2, formatMoney }

export { explainApiError } from "@/lib/error-utils"

export function trimOrNull(value: unknown): string | null {
  const normalized = String(value || "").trim()
  return normalized || null
}

export function parseAmountInput(value: unknown): number | null {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(",", ".")
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return round2(parsed)
}

export function buildSemanticChipClass(tone = "neutral"): string {
  if (tone === "success") {
    return "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"
  }

  if (tone === "warning") {
    return "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
  }

  if (tone === "danger") {
    return "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]"
  }

  if (tone === "accent") {
    return CHIP_TONE_ACCENT
  }

  return CHIP_TONE_NEUTRAL
}

export function buildVariantTone(isWholesale: boolean): "success" | "neutral" {
  return isWholesale ? "success" : "neutral"
}

export function createPaymentDraft(method = "", amount = ""): PaymentDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    amount,
    reference: "",
  }
}

export function createDefaultMixedPayments(
  totalAmount: number,
  preferredMethod = ""
): PaymentDraft[] {
  return [
    createPaymentDraft(preferredMethod, totalAmount > 0 ? totalAmount.toFixed(2) : ""),
    createPaymentDraft("", ""),
  ]
}

export function buildCashLabel(status: string): string {
  if (status === "open") return POS.cash.openLabel
  if (status === "closed") return POS.cash.closedLabel
  return POS.cash.missingLabel
}

export function buildCashTone(status: string): string {
  if (status === "open") return "sales-chip sales-chip-success"
  if (status === "closed") return "sales-chip sales-chip-danger"
  return "sales-chip sales-chip-warning"
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label || POS.payment.selectMethod
}

export function getPaymentReferenceMeta(method: string): {
  label: string
  placeholder: string
  helper: string
} {
  const meta = POS.paymentReferenceMeta as Record<string, { label: string; placeholder: string; helper: string }>
  return meta[method] ?? meta.default
}
