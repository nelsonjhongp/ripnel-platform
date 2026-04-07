"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
    BadgeCheck,
    Minus,
    Plus,
    ReceiptText,
    Search,
    ShoppingBasket,
    Trash2,
    User,
} from "lucide-react"

import { buildApiUrl } from "@/lib/api"

const DOC_TYPES = [
    { value: "none", label: "Sin comprobante" },
    { value: "boleta", label: "Boleta (DNI)" },
    { value: "factura", label: "Factura (RUC)" },
    { value: "proforma", label: "Proforma" },
]

const PAYMENT_METHODS = [
    { value: "cash", label: "Efectivo" },
    { value: "yape", label: "Yape" },
    { value: "plin", label: "Plin" },
    { value: "transfer", label: "Transferencia" },
]

const TAX_RATE = { none: 0, proforma: 0, boleta: 0.18, factura: 0.18 }

function r2(n) { return Math.round(n * 100) / 100 }
function fmt(n) { return Number(n).toFixed(2) }

export default function NuevaVentaPage() {
    const [locations, setLocations] = useState([])
    const [locationId, setLocationId] = useState("")

    const [query, setQuery] = useState("")
    const [variants, setVariants] = useState([])
    const [loadingVariants, setLoadingVariants] = useState(false)
    const [showProductDropdown, setShowProductDropdown] = useState(false)

    const [cart, setCart] = useState([])

    const [customerName, setCustomerName] = useState("")
    const [customerDocType, setCustomerDocType] = useState("none")
    const [customerDocNumber, setCustomerDocNumber] = useState("")
    const [customerAddress, setCustomerAddress] = useState("")
    const [customerQuery, setCustomerQuery] = useState("")
    const [customerResults, setCustomerResults] = useState([])
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    const [documentType, setDocumentType] = useState("none")
    const [paymentMethod, setPaymentMethod] = useState("cash")

    const [submitting, setSubmitting] = useState(false)
    const [confirmedSale, setConfirmedSale] = useState(null)
    const [error, setError] = useState(null)

    const searchDebounce = useRef(null)
    const customerDebounce = useRef(null)

    useEffect(() => {
        fetch(buildApiUrl("/api/locations"))
            .then((r) => r.json())
            .then((payload) => {
                const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
                setLocations(data)
                if (data.length > 0) setLocationId(data[0].location_id)
            })
            .catch(() => {
                setLocations([])
            })
    }, [])

    const fetchVariants = useCallback((loc, q) => {
        if (!loc) return
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(async () => {
            setLoadingVariants(true)
            try {
                const params = new URLSearchParams({ location_id: loc })
                if (q.trim()) params.set("q", q.trim())
                const res = await fetch(buildApiUrl(`/api/sales/sellable-variants?${params}`))
                if (res.ok) setVariants(await res.json())
            } finally {
                setLoadingVariants(false)
            }
        }, 300)
    }, [])

    useEffect(() => { fetchVariants(locationId, query) }, [locationId, query, fetchVariants])

    useEffect(() => {
        if (customerDebounce.current) clearTimeout(customerDebounce.current)
        if (!customerQuery.trim()) { setCustomerResults([]); return }
        customerDebounce.current = setTimeout(async () => {
            try {
                const res = await fetch(buildApiUrl(`/api/customers?q=${encodeURIComponent(customerQuery)}`))
                if (res.ok) {
                    const payload = await res.json()
                    const data = Array.isArray(payload?.data) ? payload.data : []
                    setCustomerResults(data.slice(0, 8))
                    setShowCustomerDropdown(true)
                }
            } catch { setCustomerResults([]) }
        }, 300)
    }, [customerQuery])

    function addToCart(variant) {
        setCart((prev) => {
            const existing = prev.find((i) => i.variant_id === variant.variant_id)
            if (existing) {
                return prev.map((i) =>
                    i.variant_id === variant.variant_id
                        ? { ...i, quantity: Math.min(i.quantity + 1, variant.stock) }
                        : i
                )
            }
            return [...prev, {
                variant_id: variant.variant_id,
                sku: variant.sku,
                label: `${variant.style_name} — ${variant.size_code} / ${variant.color_code}`,
                quantity: 1,
                unit_price_list: variant.retail_price,
                unit_price_final: variant.retail_price,
                stock: variant.stock,
            }]
        })
    }

    function updateQty(variantId, delta) {
        setCart((prev) =>
            prev
                .map((i) => i.variant_id === variantId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
                .filter((i) => i.quantity > 0)
        )
    }

    function removeFromCart(variantId) {
        setCart((prev) => prev.filter((i) => i.variant_id !== variantId))
    }

    const productSuggestions = useMemo(() => {
        if (!query.trim()) return []
        return variants.slice(0, 8)
    }, [query, variants])

    const totals = useMemo(() => {
        const subtotal = r2(cart.reduce((acc, i) => acc + i.unit_price_final * i.quantity, 0))
        const taxRate = TAX_RATE[documentType] ?? 0
        const tax = r2(subtotal * taxRate)
        const total = r2(subtotal + tax)
        return { subtotal, tax, total, taxRate }
    }, [cart, documentType])

    async function confirmSale() {
        if (!locationId || cart.length === 0) return
        setError(null)
        setSubmitting(true)
        try {
            const body = {
                location_id: locationId,
                document_type: documentType,
                payment_method: paymentMethod,
                customer_name_text: customerName || null,
                customer_doc_type: customerDocType || "none",
                customer_doc_number: customerDocNumber || null,
                customer_address_text: customerAddress || null,
                items: cart.map((i) => ({
                    variant_id: i.variant_id,
                    quantity: i.quantity,
                    unit_price_list: i.unit_price_list,
                    unit_price_final: i.unit_price_final,
                    price_type_applied: "retail",
                })),
            }
            const res = await fetch(buildApiUrl("/api/sales"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.message || "Error al confirmar la venta"); return }
            setConfirmedSale({ sale_id: data.sale_id, sale_number: data.sale_number })
            setCart([])
            setCustomerName("")
            setCustomerDocType("none")
            setCustomerDocNumber("")
            setCustomerAddress("")
            // refresh variants to reflect updated stock
            fetchVariants(locationId, query)
        } catch { setError("Error de red al confirmar la venta") }
        finally { setSubmitting(false) }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-5">

                <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                    <p className="text-xs uppercase tracking-wide text-violet-600">Punto de venta</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Nueva venta</h1>
                    <p className="mt-1 text-sm text-slate-600">Busca productos, arma el pedido y confirma la venta.</p>
                </header>

                {confirmedSale && (
                    <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-md">
                        <div className="flex flex-wrap items-center gap-3">
                            <BadgeCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold text-emerald-800">Venta confirmada: {confirmedSale.sale_number}</p>
                                <p className="text-sm text-emerald-700">El stock fue descontado correctamente.</p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/purchase-system/${confirmedSale.sale_id}`}
                                    className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                    Ver detalle
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setConfirmedSale(null)}
                                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                    Nueva venta
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <article className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Ubicación de venta</label>
                    <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
                    >
                        {locations.length === 0 && <option value="">Cargando ubicaciones…</option>}
                        {locations.map((l) => (
                            <option key={l.location_id} value={l.location_id}>{l.name}</option>
                        ))}
                    </select>
                </article>

                <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                    <div className="space-y-5">

                        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <Search className="h-4 w-4 text-violet-600" />
                                Buscar productos
                            </h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setShowProductDropdown(true)
                                    }}
                                    placeholder="Nombre, SKU o código de estilo…"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                    onFocus={() => productSuggestions.length > 0 && setShowProductDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                                />
                                {showProductDropdown && productSuggestions.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                                        {productSuggestions.map((v) => (
                                            <button
                                                key={`suggestion-${v.variant_id}`}
                                                type="button"
                                                onMouseDown={() => {
                                                    setQuery(`${v.style_name} ${v.size_code} ${v.color_code}`)
                                                    addToCart(v)
                                                    setShowProductDropdown(false)
                                                }}
                                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-violet-50"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-800">{v.style_name}</p>
                                                    <p className="text-xs text-slate-500">{v.sku} | {v.size_code} / {v.color_code} | Stock: {v.stock}</p>
                                                </div>
                                                <span className="ml-3 shrink-0 font-semibold text-violet-700">S/. {fmt(v.retail_price)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                                {!locationId && (
                                    <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500">
                                        Selecciona una ubicación primero.
                                    </p>
                                )}
                                {locationId && loadingVariants && (
                                    <p className="py-4 text-center text-sm text-slate-400">Cargando…</p>
                                )}
                                {locationId && !loadingVariants && variants.length === 0 && (
                                    <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500">
                                        Sin resultados{query ? ` para "${query}"` : " con stock disponible"}.
                                    </p>
                                )}
                                {variants.map((v) => (
                                    <button
                                        key={v.variant_id}
                                        type="button"
                                        onClick={() => addToCart(v)}
                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-violet-300 hover:bg-violet-50/50"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{v.style_name}</p>
                                            <p className="text-xs text-slate-500">{v.sku} | {v.size_code} / {v.color_code} | Stock: {v.stock}</p>
                                        </div>
                                        <span className="ml-4 shrink-0 text-sm font-bold text-violet-700">S/. {fmt(v.retail_price)}</span>
                                    </button>
                                ))}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <ShoppingBasket className="h-4 w-4 text-violet-600" />
                                Detalle de venta
                                {cart.length > 0 && (
                                    <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                                        {cart.reduce((a, i) => a + i.quantity, 0)} uds.
                                    </span>
                                )}
                            </h2>
                            {cart.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                                    Aún no hay productos en la venta.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {cart.map((item) => (
                                        <div key={item.variant_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.sku} | S/. {fmt(item.unit_price_final)} c/u</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button type="button" onClick={() => updateQty(item.variant_id, -1)} className="rounded-lg border border-slate-300 p-1 text-slate-600 hover:bg-slate-100">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                                <button type="button" onClick={() => updateQty(item.variant_id, 1)} disabled={item.quantity >= item.stock} className="rounded-lg border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="w-20 shrink-0 text-right text-sm font-bold text-slate-800">
                                                S/. {fmt(r2(item.unit_price_final * item.quantity))}
                                            </span>
                                            <button type="button" onClick={() => removeFromCart(item.variant_id)} className="rounded-lg p-1 text-slate-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>

                    <div className="space-y-5">

                        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <User className="h-4 w-4 text-violet-600" />
                                Cliente (opcional)
                            </h2>
                            <div className="relative mb-3">
                                <input
                                    type="text"
                                    value={customerQuery}
                                    onChange={(e) => setCustomerQuery(e.target.value)}
                                    placeholder="Buscar cliente por nombre o documento…"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                                    onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                                />
                                {showCustomerDropdown && customerResults.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                                        {customerResults.map((c) => (
                                            <button
                                                key={c.customer_id}
                                                type="button"
                                                onMouseDown={() => {
                                                    setCustomerName(c.full_name)
                                                    setCustomerDocType(c.document_type || "none")
                                                    setCustomerDocNumber(c.document_number || "")
                                                    setCustomerQuery("")
                                                    setShowCustomerDropdown(false)
                                                }}
                                                className="block w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                                            >
                                                <span className="font-medium text-slate-800">{c.full_name}</span>
                                                {c.document_number && (
                                                    <span className="ml-2 text-xs text-slate-500">
                                                        {c.document_type?.toUpperCase()} {c.document_number}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / Razón social</label>
                                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de doc.</label>
                                        <select value={customerDocType} onChange={(e) => setCustomerDocType(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400">
                                            <option value="none">Sin doc.</option>
                                            <option value="dni">DNI</option>
                                            <option value="ruc">RUC</option>
                                            <option value="ce">CE</option>
                                            <option value="passport">Pasaporte</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                                        <input type="text" value={customerDocNumber} onChange={(e) => setCustomerDocNumber(e.target.value)} placeholder={customerDocType === "ruc" ? "20123456789" : "12345678"} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400" />
                                    </div>
                                </div>
                                {documentType === "factura" && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Dirección fiscal</label>
                                        <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Dirección del contribuyente" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400" />
                                    </div>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                <ReceiptText className="h-4 w-4 text-violet-600" />
                                Comprobante y pago
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de comprobante</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {DOC_TYPES.map((dt) => (
                                            <button key={dt.value} type="button" onClick={() => setDocumentType(dt.value)}
                                                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${documentType === dt.value ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300" : "border-slate-200 text-slate-700 hover:border-violet-200"}`}>
                                                {dt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Método de pago</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PAYMENT_METHODS.map((pm) => (
                                            <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
                                                className={`rounded-xl border px-3 py-2 text-center text-sm transition ${paymentMethod === pm.value ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300" : "border-slate-200 text-slate-700 hover:border-violet-200"}`}>
                                                {pm.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>

                        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span><span>S/. {fmt(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>IGV ({(totals.taxRate * 100).toFixed(0)}%)</span><span>S/. {fmt(totals.tax)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                                    <span>Total</span><span>S/. {fmt(totals.total)}</span>
                                </div>
                            </div>
                            {error && (
                                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                            )}
                            <button
                                type="button"
                                onClick={confirmSale}
                                disabled={cart.length === 0 || !locationId || submitting}
                                className="mt-4 w-full rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {submitting ? "Procesando…" : "Confirmar venta"}
                            </button>
                        </article>

                    </div>
                </section>
            </div>
        </div>
    )
}
