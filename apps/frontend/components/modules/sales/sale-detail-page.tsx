"use client"

import Link from "next/link"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Package,
  Printer,
  ReceiptText,
  RefreshCcw,
  History,
  ShieldCheck,
  Store,
  User,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ProtectedErrorPage,
  ProtectedForbiddenPage,
  InlineStatusCard,
  ProtectedLoadingPage,
  ProtectedNotFoundPage,
} from "@/components/feedback/status-page"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ApiError, apiFetch } from "@/lib/api"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"

type SaleDetail = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  customer_doc_type: string | null
  customer_doc_number: string | null
  customer_address_text: string | null
  subtotal_amount: number
  sale_discount_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  notes: string | null
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
  details: Array<{
    sale_detail_id: string
    variant_id: string
    sku: string
    style_name: string
    style_code: string
    size_code: string
    color_code: string
    quantity: number
    unit_price_list: number
    unit_price_final: number
    line_subtotal: number
    line_tax: number
    line_total: number
  }>
  payments: Array<{
    payment_id: string
    method: string
    amount: number
    reference: string | null
    paid_at: string
  }>
}

type SaleConsistency = {
  lineSubtotal: number
  lineTax: number
  lineTotal: number
  paymentTotal: number
  balanceDue: number
  unitCount: number
  headerMatches: boolean
  paymentMatches: boolean
}

const SALE_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  draft: "Pendiente",
  cancelled: "Anulada",
}

const SALE_STATUS_CLASSES: Record<string, string> = {
  confirmed: "sales-chip sales-chip-success",
  draft: "sales-chip sales-chip-warning",
  cancelled: "sales-chip sales-chip-danger",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
  transferencia: "Transferencia",
  card: "Tarjeta",
  tarjeta: "Tarjeta",
  credit: "Crédito",
  credito: "Crédito",
}

function round2(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function isCloseEnough(left: number, right: number) {
  return Math.abs(left - right) < 0.01
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`
}

function formatDateTime(value: string | null, fallback?: string | null) {
  const source = value || fallback
  if (!source) return "-"

  return new Date(source).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function formatDocumentType(value: string) {
  if (!value) return "Documento"
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function formatPaymentMethod(value: string) {
  const normalized = String(value || "").trim().toLowerCase()
  return PAYMENT_METHOD_LABELS[normalized] || formatDocumentType(value)
}

function resolvePaymentStatus(consistency: SaleConsistency) {
  if (!consistency.headerMatches || consistency.balanceDue < -0.01) {
    return {
      label: "Inconsistente",
      className: "sales-chip sales-chip-danger",
    }
  }

  if (isCloseEnough(consistency.paymentTotal, 0)) {
    return {
      label: "Pendiente",
      className: "sales-chip sales-chip-warning",
    }
  }

  if (consistency.paymentMatches) {
    return {
      label: "Pagado",
      className: "sales-chip sales-chip-success",
    }
  }

  return {
    label: "Parcial",
    className: "sales-chip sales-chip-warning",
  }
}

function customerDocument(sale: SaleDetail) {
  if (!sale.customer_doc_type && !sale.customer_doc_number) return "Documento no registrado"
  return `${sale.customer_doc_type || ""} ${sale.customer_doc_number || ""}`.trim()
}

function SectionHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description: string
  icon: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-1">
      <div className="flex gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight text-[var(--ops-text)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="sales-panel-muted rounded-lg px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">{label}</p>
      <div className="mt-1 text-sm font-medium text-[var(--ops-text)]">{value}</div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm",
        strong ? "font-semibold text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"
      )}
    >
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  )
}

function SaleActionsMenu({
  sale,
  onMockAction,
}: {
  sale: SaleDetail
  onMockAction: (message: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg px-3">
          <MoreHorizontal className="h-4 w-4" />
          Más acciones
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-56 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)]"
      >
        <DropdownMenuItem onClick={() => onMockAction("Duplicación de venta pendiente de integración.")}>
          <Copy className="h-4 w-4" />
          Duplicar venta
        </DropdownMenuItem>
        {sale.status === "confirmed" ? (
          <DropdownMenuItem asChild>
            <Link href={`/postventa/${sale.sale_id}`}>
              <RefreshCcw className="h-4 w-4" />
              Registrar postventa
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onMockAction("Postventa disponible solo para ventas confirmadas.")}>
            <RefreshCcw className="h-4 w-4" />
            Registrar postventa
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onMockAction("Anulación de venta pendiente de flujo comercial.")}
        >
          <Ban className="h-4 w-4" />
          Anular venta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onMockAction("El comprobante se está preparando como vista previa.")}>
          <ExternalLink className="h-4 w-4" />
          Ver comprobante
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={appRoutes.purchaseSystem}>
            <ReceiptText className="h-4 w-4" />
            Nueva venta
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SaleDetailHeader({
  sale,
  consistency,
}: {
  sale: SaleDetail
  consistency: SaleConsistency
}) {
  const paymentStatus = resolvePaymentStatus(consistency)

  return (
    <header className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.01em] text-[var(--ops-text)] md:text-[1.75rem]">
              {sale.sale_number || "Sin correlativo"}
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                SALE_STATUS_CLASSES[sale.status] || "sales-chip sales-chip-neutral"
              )}
            >
              {SALE_STATUS_LABELS[sale.status] || formatDocumentType(sale.status)}
            </span>
          </div>

          <p className="text-sm text-[var(--ops-text-muted)]">
            {formatDocumentType(sale.document_type)} · {formatDateTime(sale.confirmed_at, sale.created_at)} ·{" "}
            {sale.location_name || "Sede no registrada"}
          </p>

          <div>
            <p className="text-base font-semibold text-[var(--ops-text)]">
              {sale.customer_name_text || "Cliente general"}
            </p>
            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
              {customerDocument(sale)}
              {sale.customer_address_text ? ` · ${sale.customer_address_text}` : ""}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))] px-4 py-3 lg:min-w-72">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--ripnel-accent)_78%,var(--ops-text))]">
            Total venta
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
            {formatCurrency(Number(sale.total_amount))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
            <span>Pagado: {formatCurrency(consistency.paymentTotal)}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", paymentStatus.className)}>
              {paymentStatus.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

function SaleProductsTable({ sale }: { sale: SaleDetail }) {
  return (
    <section>
      <SectionHeader
        icon={<Package className="h-4 w-4" />}
        title="Productos vendidos"
        description="Prendas, variantes y cantidades incluidas en esta venta."
      />

      <article className="sales-panel rounded-lg p-0 shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[820px] border-y border-[var(--ops-border-strong)]">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Precio unitario</th>
                  <th className="px-4 py-3 text-right">Descuento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {sale.details.map((line) => {
                  const quantity = Number(line.quantity || 0)
                  const listPrice = Number(line.unit_price_list || 0)
                  const finalPrice = Number(line.unit_price_final || 0)
                  const lineDiscount = Math.max(0, round2((listPrice - finalPrice) * quantity))

                  return (
                    <tr key={line.sale_detail_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {line.style_code || line.sku || "Sin código"}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          {line.size_code || "ST"} / {line.color_code || "Único"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {line.sku}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-medium text-[var(--ops-text)]">
                        {quantity}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                        <p className="text-sm font-medium text-[var(--ops-text)]">{formatCurrency(finalPrice)}</p>
                        {!isCloseEnough(listPrice, finalPrice) ? (
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            Lista {formatCurrency(listPrice)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                        {lineDiscount > 0 ? formatCurrency(lineDiscount) : "—"}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] text-right align-top">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatCurrency(Number(line.line_total))}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          Subtotal {formatCurrency(Number(line.line_subtotal))}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  )
}

function SaleSummaryCard({
  sale,
  consistency,
}: {
  sale: SaleDetail
  consistency: SaleConsistency
}) {
  const paymentStatus = resolvePaymentStatus(consistency)

  return (
    <section>
      <SectionHeader
        icon={<ReceiptText className="h-4 w-4" />}
        title="Resumen comercial"
        description="Importes, descuentos, impuestos y estado de pago."
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,var(--ops-surface))] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--ripnel-accent)_78%,var(--ops-text))]">
            Total venta
          </p>
          <p className="mt-1 text-3xl font-semibold text-[var(--ops-text)]">{formatCurrency(Number(sale.total_amount))}</p>
        </div>

        <div className="mt-4 space-y-2">
          <SummaryRow label="Pagado" value={formatCurrency(consistency.paymentTotal)} strong />
          <SummaryRow label="Saldo pendiente" value={formatCurrency(Math.max(0, consistency.balanceDue))} />
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--ops-text-muted)]">Estado de pago</span>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", paymentStatus.className)}>
              {paymentStatus.label}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
          <SummaryRow label="Ítems vendidos" value={String(sale.details.length)} />
          <SummaryRow label="Unidades" value={String(consistency.unitCount)} />
          <SummaryRow label="Subtotal" value={formatCurrency(Number(sale.subtotal_amount))} />
          <SummaryRow label="Descuento" value={formatCurrency(Number(sale.sale_discount_amount || 0))} />
          <SummaryRow label="IGV" value={formatCurrency(Number(sale.tax_amount))} />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
            Integridad comercial
          </p>
          <div className="mt-2 space-y-1.5 text-sm text-[var(--ops-text-muted)]">
            <p className="flex gap-2">
              <CheckCircle2
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  consistency.headerMatches
                    ? "text-[color:color-mix(in_srgb,#059669_76%,var(--ops-text))]"
                    : "text-[color:color-mix(in_srgb,#b45309_82%,var(--ops-text))]"
                )}
              />
              {consistency.headerMatches ? "Cabecera y líneas coinciden." : "Cabecera y líneas no coinciden."}
            </p>
            <p className="flex gap-2">
              <CheckCircle2
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  consistency.paymentMatches
                    ? "text-[color:color-mix(in_srgb,#059669_76%,var(--ops-text))]"
                    : "text-[color:color-mix(in_srgb,#b45309_82%,var(--ops-text))]"
                )}
              />
              {consistency.paymentMatches
                ? "Los pagos cubren exactamente el total."
                : "La suma de pagos no cubre el total."}
            </p>
          </div>
        </div>
      </article>
    </section>
  )
}

function SalePaymentsCard({ sale }: { sale: SaleDetail }) {
  return (
    <section>
      <SectionHeader
        icon={<CreditCard className="h-4 w-4" />}
        title="Pagos registrados"
        description="Métodos de pago asociados a esta venta."
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <div className="space-y-2">
          {sale.payments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 py-4 text-sm text-[var(--ops-text-muted)]">
              No hay pagos registrados.
            </p>
          ) : (
            sale.payments.map((payment) => (
              <div key={payment.payment_id} className="sales-panel-muted rounded-lg px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ops-text)]">{formatPaymentMethod(payment.method)}</p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{formatDateTime(payment.paid_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--ops-text)]">{formatCurrency(Number(payment.amount))}</p>
                </div>
                {payment.reference ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    Ref. {payment.reference}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  )
}

function SaleCustomerCard({ sale }: { sale: SaleDetail }) {
  return (
    <section>
      <SectionHeader
        icon={<User className="h-4 w-4" />}
        title="Datos del cliente"
        description="Información fiscal y comercial asociada a la venta."
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <DetailField label="Cliente" value={sale.customer_name_text || "Cliente general"} />
          <DetailField label="Documento" value={customerDocument(sale)} />
          <DetailField
            label="Dirección"
            value={sale.customer_address_text || <span className="text-[var(--ops-text-muted)]">No registrado</span>}
          />
        </div>
      </article>
    </section>
  )
}

function SaleOperationalDataCard({ sale }: { sale: SaleDetail }) {
  return (
    <section>
      <SectionHeader
        icon={<Store className="h-4 w-4" />}
        title="Datos operativos"
        description="Información interna de sede, vendedor y registro."
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <DetailField label="Sede" value={sale.location_name || "No registrado"} />
          <DetailField label="Vendedor" value={sale.seller_name || "No registrado"} />
          <DetailField label="Registrada por" value={sale.seller_name || "No registrado"} />
          <DetailField label="Fecha registrada" value={formatDateTime(sale.created_at)} />
          <DetailField
            label="Fecha confirmada"
            value={sale.confirmed_at ? formatDateTime(sale.confirmed_at) : "Pendiente"}
          />
          {sale.notes ? <DetailField label="Observación" value={sale.notes} /> : null}
        </div>
      </article>
    </section>
  )
}

function SaleTimeline({ sale }: { sale: SaleDetail }) {
  const events = [
    {
      label: "Venta registrada",
      detail: formatDateTime(sale.created_at),
      actor: sale.seller_name || "Usuario no identificado",
    },
    ...(sale.confirmed_at
      ? [
          {
            label: "Venta confirmada",
            detail: formatDateTime(sale.confirmed_at),
            actor: sale.seller_name || "Usuario no identificado",
          },
        ]
      : []),
    ...sale.payments.map((payment) => ({
      label: "Pago registrado",
      detail: `${formatPaymentMethod(payment.method)} · ${formatCurrency(Number(payment.amount))}`,
      actor: formatDateTime(payment.paid_at),
    })),
    ...(sale.status === "cancelled"
      ? [
          {
            label: "Venta anulada",
            detail: "Estado actual de la operación",
            actor: "Trazabilidad pendiente de integración",
          },
        ]
      : []),
  ]

  return (
    <section>
      <SectionHeader
        icon={<History className="h-4 w-4" />}
        title="Trazabilidad"
        description="Eventos registrados durante el ciclo de vida de la venta."
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <ol className="space-y-4">
          {events.map((event, index) => (
            <li key={`${event.label}-${index}`} className="relative flex gap-3">
              {index < events.length - 1 ? (
                <span className="absolute left-[7px] top-5 h-[calc(100%+0.25rem)] w-px bg-[var(--ops-border-strong)]" />
              ) : null}
              <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--ops-text)]">{event.label}</p>
                <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{event.detail}</p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{event.actor}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  )
}

function SalePostSaleCard({
  sale,
  onMockAction,
}: {
  sale: SaleDetail
  onMockAction: (message: string) => void
}) {
  return (
    <section>
      <SectionHeader
        icon={<RefreshCcw className="h-4 w-4" />}
        title="Postventa"
        description="Gestión de devoluciones, cambios o incidencias posteriores a la venta."
        action={
          sale.status === "confirmed" ? (
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href={`/postventa/${sale.sale_id}`}>Registrar postventa</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg px-3"
              onClick={() => onMockAction("Postventa disponible solo para ventas confirmadas.")}
            >
              Registrar postventa
            </Button>
          )
        }
      />

      <article className="sales-panel rounded-lg p-5 shadow-sm">
        <p className="text-sm text-[var(--ops-text-muted)]">No hay eventos de postventa registrados.</p>
      </article>
    </section>
  )
}

function SaleDocumentPreviewPanel({
  sale,
  consistency,
  open,
  onOpenChange,
  onMockAction,
}: {
  sale: SaleDetail
  consistency: SaleConsistency
  open: boolean
  onOpenChange: (open: boolean) => void
  onMockAction: (message: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[min(100vw,860px)] !max-w-[860px] border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-0"
      >
        <SheetHeader className="border-b border-[var(--ops-border-strong)] px-5 py-4">
          <div className="pr-10">
            <SheetTitle className="text-lg font-semibold text-[var(--ops-text)]">
              Vista previa del comprobante
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-[var(--ops-text-muted)]">
              Revisa el documento antes de imprimir o descargar.
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ops-border-strong)] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-3"
            onClick={() => {
              onMockAction("Función de impresión preparada.")
              window.print()
            }}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-3"
            onClick={() => onMockAction("Generación de PDF pendiente de integración.")}
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <SheetClose asChild>
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-3">
              Cancelar
            </Button>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--ops-surface-muted)] px-4 py-5 md:px-8">
          <div className="mx-auto min-h-[960px] max-w-[680px] rounded-lg border border-[var(--ops-border-strong)] bg-white p-8 text-slate-950 shadow-xl dark:bg-white dark:text-slate-950">
            <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.02em]">RIPNEL</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Comprobante comercial</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{sale.sale_number || "Sin correlativo"}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDocumentType(sale.document_type)}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(sale.confirmed_at, sale.created_at)}</p>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 py-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cliente</p>
                <p className="mt-1 text-sm font-semibold">{sale.customer_name_text || "Cliente general"}</p>
                <p className="mt-1 text-sm text-slate-600">{customerDocument(sale)}</p>
                {sale.customer_address_text ? <p className="mt-1 text-sm text-slate-600">{sale.customer_address_text}</p> : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operación</p>
                <p className="mt-1 text-sm text-slate-600">Sede: {sale.location_name}</p>
                <p className="mt-1 text-sm text-slate-600">Vendedor: {sale.seller_name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estado: {SALE_STATUS_LABELS[sale.status] || formatDocumentType(sale.status)}
                </p>
              </div>
            </div>

            <div className="py-5">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="py-2 pr-3">Producto</th>
                    <th className="px-3 py-2">Variante</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">P. unit.</th>
                    <th className="py-2 pl-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.details.map((line) => (
                    <tr key={line.sale_detail_id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 align-top">
                        <p className="font-medium">{line.style_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{line.style_code || line.sku}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-slate-600">
                        {line.size_code || "ST"} / {line.color_code || "Único"}
                      </td>
                      <td className="px-3 py-3 text-right">{line.quantity}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(Number(line.unit_price_final))}</td>
                      <td className="py-3 pl-3 text-right font-semibold">{formatCurrency(Number(line.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-[320px] space-y-2 border-t border-slate-200 pt-4">
              <SummaryRow label="Subtotal" value={formatCurrency(Number(sale.subtotal_amount))} />
              <SummaryRow label="Descuento" value={formatCurrency(Number(sale.sale_discount_amount || 0))} />
              <SummaryRow label="IGV" value={formatCurrency(Number(sale.tax_amount))} />
              <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between gap-4 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(Number(sale.total_amount))}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pagos</p>
              <div className="mt-2 space-y-1">
                {sale.payments.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay pagos registrados.</p>
                ) : (
                  sale.payments.map((payment) => (
                    <div key={payment.payment_id} className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-600">{formatPaymentMethod(payment.method)}</span>
                      <span className="font-medium">{formatCurrency(Number(payment.amount))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              RIPNEL · Documento de previsualización comercial · Pagado: {formatCurrency(consistency.paymentTotal)}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-[var(--ops-border-strong)] px-5 py-3">
          <p className="text-xs text-[var(--ops-text-muted)]">
            Esta vista es una previsualización. La generación real del PDF puede conectarse posteriormente al backend.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadSale() {
      setLoading(true)
      setError(null)

      try {
        const { saleId } = await params
        const data = await apiFetch<SaleDetail>(`/api/sales/${saleId}`, {
          cache: "no-store",
        })

        if (active) {
          setSale(data)
        }
      } catch (loadError) {
        if (active) {
          setSale(null)
          setError(loadError instanceof Error ? loadError : new Error("No se pudo cargar la venta"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSale()

    return () => {
      active = false
    }
  }, [params])

  const consistency = useMemo(() => {
    if (!sale) return null

    const lineSubtotal = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_subtotal || 0), 0)
    )
    const lineTax = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_tax || 0), 0)
    )
    const lineTotal = round2(
      sale.details.reduce((accumulator, line) => accumulator + Number(line.line_total || 0), 0)
    )
    const paymentTotal = round2(
      sale.payments.reduce((accumulator, payment) => accumulator + Number(payment.amount || 0), 0)
    )
    const unitCount = sale.details.reduce((accumulator, line) => accumulator + Number(line.quantity || 0), 0)

    const headerMatches =
      isCloseEnough(lineSubtotal, Number(sale.subtotal_amount || 0)) &&
      isCloseEnough(lineTax, Number(sale.tax_amount || 0)) &&
      isCloseEnough(lineTotal, Number(sale.total_amount || 0))
    const paymentMatches = isCloseEnough(paymentTotal, Number(sale.total_amount || 0))

    return {
      lineSubtotal,
      lineTax,
      lineTotal,
      paymentTotal,
      balanceDue: round2(Number(sale.total_amount || 0) - paymentTotal),
      unitCount,
      headerMatches,
      paymentMatches,
    }
  }, [sale])

  function showMockAction(message: string) {
    setActionMessage(message)
  }

  if (loading) {
    return (
      <ProtectedLoadingPage
        title="Cargando detalle de venta"
        description="Estamos recuperando la venta confirmada y sus movimientos asociados."
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <ProtectedNotFoundPage />
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ProtectedForbiddenPage />
  }

  if (error || !sale || !consistency) {
    return (
      <ProtectedErrorPage
        title="No pudimos abrir el detalle de venta"
        description={error?.message || "La venta solicitada no está disponible para esta sede operativa."}
      />
    )
  }

  return (
    <PermissionGuard permission="sales.pos">
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" size="sm" className="w-fit rounded-lg px-3">
              <Link href={appRoutes.transactionHistory}>
                <ArrowLeft className="h-4 w-4" />
                Volver al historial
              </Link>
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg px-3"
                onClick={() => {
                  setPreviewOpen(true)
                  showMockAction("Vista de impresión abierta como previsualización.")
                }}
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg px-3"
                onClick={() => {
                  setPreviewOpen(true)
                  showMockAction("Generación de PDF pendiente de integración.")
                }}
              >
                <FileText className="h-4 w-4" />
                Generar PDF
              </Button>
              <SaleActionsMenu sale={sale} onMockAction={showMockAction} />
            </div>
          </div>

          {actionMessage ? (
            <InlineStatusCard
              title="Acción preparada"
              description={actionMessage}
              tone="neutral"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          ) : null}

          <SaleDetailHeader sale={sale} consistency={consistency} />

          {!consistency.headerMatches ? (
            <InlineStatusCard
              title="La venta necesita revisión"
              description="Los totales de cabecera no coinciden con la suma de las líneas persistidas. Conviene contrastar la venta antes de tomarla como referencia operativa."
              tone="warning"
            />
          ) : null}

          {consistency.headerMatches && !consistency.paymentMatches ? (
            <InlineStatusCard
              title="Pago inconsistente con el total"
              description="Las líneas coinciden con la cabecera, pero la suma de pagos registrados no cubre el total de la venta."
              tone="warning"
            />
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.72fr)] lg:items-start">
            <div className="space-y-5 lg:order-1">
              <SaleProductsTable sale={sale} />
            </div>

            <aside className="space-y-5 lg:sticky lg:top-20 lg:order-2">
              <SaleSummaryCard sale={sale} consistency={consistency} />
              <SalePaymentsCard sale={sale} />
            </aside>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SaleCustomerCard sale={sale} />
            <SaleOperationalDataCard sale={sale} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <SaleTimeline sale={sale} />
            <SalePostSaleCard sale={sale} onMockAction={showMockAction} />
          </div>
        </div>

        <SaleDocumentPreviewPanel
          sale={sale}
          consistency={consistency}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onMockAction={showMockAction}
        />
      </section>
    </PermissionGuard>
  )
}
