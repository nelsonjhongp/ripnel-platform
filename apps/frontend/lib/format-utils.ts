export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "-"

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatMoney(value: unknown): string {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized.toFixed(2) : "--"
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}
