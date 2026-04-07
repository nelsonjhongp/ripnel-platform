"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CreditCard, ReceiptText, User } from "lucide-react"

import { buildApiUrl } from "@/lib/api"

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

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { saleId } = await params
        const res = await fetch(buildApiUrl(`/api/sales/${saleId}`))
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || "No se pudo cargar la venta")
        }
        if (active) setSale(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar la venta")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [params])

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Cargando detalle de venta…</div>
  }

  if (error || !sale) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error || "Venta no encontrada"}</p>
        <Link href="/transaction-history" className="mt-4 inline-block text-sm text-violet-700 hover:underline">
          Volver al historial
        </Link>
      </div>
    )
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/transaction-history"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </Link>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Detalle de venta</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{sale.sale_number || "Sin correlativo"}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {sale.document_type} • {sale.status} • {new Date(sale.confirmed_at || sale.created_at).toLocaleString("es-PE")}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ReceiptText className="h-4 w-4 text-violet-600" />
                Productos vendidos
              </h2>
              <div className="space-y-2">
                {sale.details.map((line) => (
                  <div key={line.sale_detail_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{line.style_name}</p>
                        <p className="text-xs text-slate-500">
                          {line.sku} • {line.size_code} / {line.color_code}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">S/. {Number(line.line_total).toFixed(2)}</p>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                      <span>Cantidad: {line.quantity}</span>
                      <span>Lista: S/. {Number(line.unit_price_list).toFixed(2)}</span>
                      <span>Final: S/. {Number(line.unit_price_final).toFixed(2)}</span>
                      <span>Subtotal: S/. {Number(line.line_subtotal).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {sale.notes && (
              <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
                <h2 className="mb-2 text-lg font-semibold text-slate-800">Notas</h2>
                <p className="text-sm text-slate-600">{sale.notes}</p>
              </article>
            )}
          </div>

          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <User className="h-4 w-4 text-violet-600" />
                Cliente
              </h2>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-medium">Nombre:</span> {sale.customer_name_text || "Cliente general"}</p>
                <p><span className="font-medium">Documento:</span> {sale.customer_doc_type || "-"} {sale.customer_doc_number || ""}</p>
                <p><span className="font-medium">Dirección:</span> {sale.customer_address_text || "-"}</p>
                <p><span className="font-medium">Ubicación:</span> {sale.location_name}</p>
                <p><span className="font-medium">Vendedor:</span> {sale.seller_name}</p>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <CreditCard className="h-4 w-4 text-violet-600" />
                Pagos
              </h2>
              <div className="space-y-2 text-sm text-slate-700">
                {sale.payments.length === 0 ? (
                  <p>No hay pagos registrados.</p>
                ) : (
                  sale.payments.map((payment) => (
                    <div key={payment.payment_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="font-medium text-slate-800">{payment.method}</p>
                      <p>Monto: S/. {Number(payment.amount).toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{new Date(payment.paid_at).toLocaleString("es-PE")}</p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>S/. {Number(sale.subtotal_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IGV</span>
                  <span>S/. {Number(sale.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>S/. {Number(sale.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
