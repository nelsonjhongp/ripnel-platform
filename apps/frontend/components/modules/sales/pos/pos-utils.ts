import type {
  PaymentDraft,
  PosPricingConfig,
  PriceModeOverride,
  EffectivePriceMode,
  CartItem,
} from "./pos-types"
import { PAYMENT_METHODS } from "./pos-types"

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
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
  }

  return "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]"
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
  if (status === "open") return "Caja operativa abierta"
  if (status === "closed") return "Caja cerrada"
  return "Aún no se abrió caja"
}

export function buildCashTone(status: string): string {
  if (status === "open") return "sales-chip sales-chip-success"
  if (status === "closed") return "sales-chip sales-chip-danger"
  return "sales-chip sales-chip-warning"
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label || "Selecciona"
}

export function getPaymentReferenceMeta(method: string): {
  label: string
  placeholder: string
  helper: string
} {
  if (method === "cash") {
    return {
      label: "Referencia",
      placeholder: "Opcional",
      helper: "En efectivo es opcional. Solo úsalo si necesitas dejar una observación corta.",
    }
  }

  if (method === "transfer") {
    return {
      label: "Operación / voucher",
      placeholder: "Nro. de operación o voucher",
      helper: "Registra el número de operación o voucher para rastrear el depósito.",
    }
  }

  if (method === "yape" || method === "plin") {
    return {
      label: "Operación / celular",
      placeholder: "Últimos 4 dígitos o código",
      helper: "Registra código o últimos 4 dígitos para identificar el abono.",
    }
  }

  return {
    label: "Referencia",
    placeholder: "Código de referencia",
    helper: "Usa este campo para dejar el dato que ayude a rastrear el pago.",
  }
}
