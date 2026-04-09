"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Tag,
  Trash2,
  User,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { useAuth } from "@/components/auth/AuthProvider"
import { ApiError, apiFetch, unwrapApiData } from "@/lib/api"

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
const GENERIC_CUSTOMER_CODE = "SALE-CLI-001"

function round2(value) {
  return Math.round(value * 100) / 100
}

function formatMoney(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized.toFixed(2) : "--"
}

function buildCustomerDisplayName(customer) {
  if (!customer) return "Cliente no seleccionado"
  return (
    customer.display_name ||
    customer.full_name ||
    customer.business_name ||
    customer.commercial_name ||
    "Cliente sin nombre"
  )
}

function buildCustomerDocument(customer) {
  if (!customer || !customer.document_type || customer.document_type === "none") {
    return "Sin documento"
  }

  return `${String(customer.document_type).toUpperCase()} ${customer.document_number || ""}`.trim()
}

function isCustomerValidForDocumentType(customer, documentType) {
  if (!customer) return false

  if (documentType === "boleta") {
    return customer.document_type === "dni" && Boolean(customer.document_number)
  }

  if (documentType === "factura") {
    return (
      customer.document_type === "ruc" &&
      Boolean(customer.document_number) &&
      Boolean(customer.address)
    )
  }

  return true
}

function groupVariantsByStyle(variants) {
  const grouped = new Map()

  for (const variant of variants) {
    if (!grouped.has(variant.style_id)) {
      grouped.set(variant.style_id, {
        style_id: variant.style_id,
        style_name: variant.style_name,
        style_code: variant.style_code,
        variants: [],
      })
    }

    grouped.get(variant.style_id).variants.push(variant)
  }

  return Array.from(grouped.values())
}

function explainApiError(error, fallback) {
  if (!(error instanceof ApiError)) {
    return fallback
  }

  if (error.status === 403) {
    return "Tu usuario no tiene permisos para operar ventas en este módulo."
  }

  if (error.status === 409) {
    return error.message
  }

  if (error.status === 401) {
    return "La sesión ya no es válida. Inicia sesión otra vez para continuar."
  }

  return error.message || fallback
}

export default function NuevaVentaPage() {
  const { defaultLocation, locationsLoading } = useAuth()

  const [query, setQuery] = useState("")
  const [variants, setVariants] = useState([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [selectedStyleId, setSelectedStyleId] = useState(null)

  const [cart, setCart] = useState([])

  const [documentType, setDocumentType] = useState("none")
  const [paymentMethod, setPaymentMethod] = useState("cash")

  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [genericCustomer, setGenericCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadGenericCustomer() {
      try {
        const response = await apiFetch(
          `/api/customers?q=${encodeURIComponent(GENERIC_CUSTOMER_CODE)}`
        )
        const customers = unwrapApiData(response)
        const generic =
          (Array.isArray(customers) ? customers : []).find(
            (customer) => customer.internal_code === GENERIC_CUSTOMER_CODE
          ) || null

        if (active) {
          setGenericCustomer(generic)
          setSelectedCustomer((current) => current || generic)
        }
      } catch {
        if (active) {
          setGenericCustomer(null)
        }
      }
    }

    loadGenericCustomer()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!defaultLocation?.location_id) {
      setVariants([])
      setSelectedStyleId(null)
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingVariants(true)

      try {
        const params = new URLSearchParams()
        if (query.trim()) {
          params.set("q", query.trim())
        }

        const path = params.toString()
          ? `/api/sales/sellable-variants?${params.toString()}`
          : "/api/sales/sellable-variants"
        const response = await apiFetch(path)
        const nextVariants = Array.isArray(response) ? response : []

        if (!active) return

        setError(null)
        setVariants(nextVariants)
      } catch (fetchError) {
        if (!active) return
        setVariants([])
        setError(explainApiError(fetchError, "No se pudieron cargar productos"))
      } finally {
        if (active) {
          setLoadingVariants(false)
        }
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [defaultLocation?.location_id, query])

  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([])
      setLoadingCustomers(false)
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingCustomers(true)

      try {
        const response = await apiFetch(
          `/api/customers?q=${encodeURIComponent(customerQuery.trim())}`
        )
        const customers = unwrapApiData(response)

        if (active) {
          setCustomerResults(Array.isArray(customers) ? customers.slice(0, 8) : [])
        }
      } catch {
        if (active) {
          setCustomerResults([])
        }
      } finally {
        if (active) {
          setLoadingCustomers(false)
        }
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [customerQuery])

  const styles = useMemo(() => groupVariantsByStyle(variants), [variants])

  useEffect(() => {
    if (styles.length === 0) {
      setSelectedStyleId(null)
      return
    }

    const hasSelectedStyle = styles.some((style) => style.style_id === selectedStyleId)
    if (!hasSelectedStyle) {
      setSelectedStyleId(styles[0].style_id)
    }
  }, [styles, selectedStyleId])

  const selectedStyle = useMemo(
    () => styles.find((style) => style.style_id === selectedStyleId) || null,
    [styles, selectedStyleId]
  )

  const totals = useMemo(() => {
    const subtotal = round2(
      cart.reduce((accumulator, item) => accumulator + Number(item.retail_price || 0) * item.quantity, 0)
    )
    const taxRate = TAX_RATE[documentType] ?? 0
    const tax = round2(subtotal * taxRate)
    const total = round2(subtotal + tax)
    const hasMissingPrice = cart.some((item) => item.retail_price === null || item.retail_price === undefined)

    return { subtotal, tax, total, taxRate, hasMissingPrice }
  }, [cart, documentType])

  const customerIsValid = isCustomerValidForDocumentType(selectedCustomer, documentType)
  const canSubmit =
    cart.length > 0 &&
    Boolean(defaultLocation?.location_id) &&
    !locationsLoading &&
    customerIsValid &&
    !submitting

  function addToCart(variant) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.variant_id === variant.variant_id)

      if (existingItem) {
        return currentCart.map((item) =>
          item.variant_id === variant.variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, variant.stock),
                retail_price: variant.retail_price,
                stock: variant.stock,
              }
            : item
        )
      }

      return [
        ...currentCart,
        {
          variant_id: variant.variant_id,
          sku: variant.sku,
          style_name: variant.style_name,
          size_code: variant.size_code,
          color_code: variant.color_code,
          label: `${variant.style_name} - ${variant.size_code} / ${variant.color_code}`,
          quantity: 1,
          retail_price: variant.retail_price,
          stock: variant.stock,
        },
      ]
    })
  }

  function updateQty(variantId, delta) {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.variant_id !== variantId) {
            return item
          }

          const nextQuantity = Math.max(1, Math.min(item.stock, item.quantity + delta))
          return { ...item, quantity: nextQuantity }
        })
        .filter(Boolean)
    )
  }

  function removeFromCart(variantId) {
    setCart((currentCart) => currentCart.filter((item) => item.variant_id !== variantId))
  }

  function selectCustomer(customer) {
    setSelectedCustomer(customer)
    setCustomerQuery("")
    setCustomerResults([])
  }

  async function confirmSale() {
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const sale = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selectedCustomer?.customer_id || null,
          document_type: documentType,
          payment_method: paymentMethod,
          items: cart.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        }),
      })

      setConfirmedSale({
        sale_id: sale.sale_id,
        sale_number: sale.sale_number,
      })
      setCart([])
      setSelectedCustomer(genericCustomer)
      setCustomerQuery("")
    } catch (submitError) {
      setError(explainApiError(submitError, "No se pudo confirmar la venta"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PermissionGuard permission="sales.pos">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Punto de venta</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Nueva venta</h1>
          <p className="mt-1 text-sm text-slate-600">
            Registra una venta usando la sede operativa del usuario y precio resuelto por backend.
          </p>
        </header>

        {!defaultLocation?.location_id && !locationsLoading && (
          <InlineStatusCard
            title="No hay sede operativa activa"
            description="Debes tener una sede default asignada para registrar ventas. Configúrala desde tu cuenta o solicita apoyo al administrador."
            tone="warning"
            icon={<MapPin className="h-5 w-5" />}
          />
        )}

        {confirmedSale && (
          <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-800">
                  Venta confirmada: {confirmedSale.sale_number}
                </p>
                <p className="text-sm text-emerald-700">
                  La venta quedo registrada y el stock fue descontado.
                </p>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contexto operativo
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="h-4 w-4 text-violet-600" />
                <span className="font-medium text-slate-900">
                  {locationsLoading
                    ? "Cargando sede..."
                    : defaultLocation?.name || "Sin sede default asignada"}
                </span>
                {defaultLocation?.code && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {defaultLocation.code}
                  </span>
                )}
              </div>
            </div>
            <p className="max-w-md text-sm text-slate-500">
              La sede se toma de la configuracion del usuario. Nueva venta ya no permite cambiarla manualmente.
            </p>
          </div>
        </article>

        <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Search className="h-4 w-4 text-violet-600" />
                Selector de producto
              </h2>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por estilo, SKU, talla o color"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.25fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Tag className="h-4 w-4 text-violet-600" />
                    Estilos
                  </div>

                  {!defaultLocation?.location_id ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                      Configura una sede default para operar ventas.
                    </p>
                  ) : loadingVariants ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                      Cargando productos...
                    </p>
                  ) : styles.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                      No hay estilos vendibles para la sede actual.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {styles.map((style) => {
                        const totalStock = style.variants.reduce(
                          (accumulator, variant) => accumulator + Number(variant.stock || 0),
                          0
                        )

                        return (
                          <button
                            key={style.style_id}
                            type="button"
                            onClick={() => setSelectedStyleId(style.style_id)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                              selectedStyleId === style.style_id
                                ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/60"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{style.style_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {style.style_code || "Sin codigo"} · {style.variants.length} combinaciones · Stock {totalStock}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedStyle?.style_name || "Selecciona un estilo"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedStyle?.style_code || "Elige un estilo para ver tallas y colores disponibles."}
                      </p>
                    </div>
                  </div>

                  {!selectedStyle ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500">
                      Sin estilo seleccionado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStyle.variants.map((variant) => {
                        const hasPrice =
                          variant.retail_price !== null && variant.retail_price !== undefined

                        return (
                          <div
                            key={variant.variant_id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {variant.size_code} / {variant.color_code}
                              </p>
                              <p className="text-xs text-slate-500">
                                {variant.sku} · Stock {variant.stock}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Precio: {hasPrice ? `S/. ${formatMoney(variant.retail_price)}` : "Sin precio vigente"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addToCart(variant)}
                              className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
                            >
                              Agregar
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ShoppingBasket className="h-4 w-4 text-violet-600" />
                Detalle de venta
                {cart.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                    {cart.reduce((accumulator, item) => accumulator + item.quantity, 0)} uds.
                  </span>
                )}
              </h2>

              {cart.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                  Aun no hay productos agregados a la venta.
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.variant_id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500">
                          {item.sku} · {item.retail_price == null ? "Sin precio vigente" : `S/. ${formatMoney(item.retail_price)} c/u`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(item.variant_id, -1)}
                          className="rounded-lg border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.variant_id, 1)}
                          disabled={item.quantity >= item.stock}
                          className="rounded-lg border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-20 shrink-0 text-right text-sm font-bold text-slate-800">
                        S/. {formatMoney(round2(Number(item.retail_price || 0) * item.quantity))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variant_id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                      >
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
                Cliente
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Buscar cliente
                  </label>
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="Nombre, documento o codigo"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                {loadingCustomers && (
                  <p className="text-xs text-slate-500">Buscando clientes...</p>
                )}

                {customerResults.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.customer_id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="block w-full rounded-xl bg-white px-3 py-2 text-left text-sm transition hover:bg-violet-50"
                      >
                        <span className="font-medium text-slate-800">
                          {buildCustomerDisplayName(customer)}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {buildCustomerDocument(customer)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente seleccionado
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {buildCustomerDisplayName(selectedCustomer)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {buildCustomerDocument(selectedCustomer)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedCustomer?.address || "Sin direccion registrada"}
                  </p>
                  {genericCustomer && selectedCustomer?.customer_id !== genericCustomer.customer_id && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(genericCustomer)}
                      className="mt-3 text-xs font-semibold text-violet-700 hover:underline"
                    >
                      Volver a cliente mostrador
                    </button>
                  )}
                </div>

                {!customerIsValid && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {documentType === "boleta"
                      ? "Para boleta debes seleccionar un cliente con DNI."
                      : "Para factura debes seleccionar un cliente con RUC y direccion."}
                  </p>
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
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Tipo de comprobante
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DOC_TYPES.map((docType) => (
                      <button
                        key={docType.value}
                        type="button"
                        onClick={() => setDocumentType(docType.value)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          documentType === docType.value
                            ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300"
                            : "border-slate-200 text-slate-700 hover:border-violet-200"
                        }`}
                      >
                        {docType.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Metodo de pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`rounded-xl border px-3 py-2 text-center text-sm transition ${
                          paymentMethod === method.value
                            ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300"
                            : "border-slate-200 text-slate-700 hover:border-violet-200"
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>S/. {formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IGV ({(totals.taxRate * 100).toFixed(0)}%)</span>
                  <span>S/. {formatMoney(totals.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>S/. {formatMoney(totals.total)}</span>
                </div>
              </div>

              {totals.hasMissingPrice && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Hay items sin precio vigente. El backend rechazara la venta hasta que exista un precio activo.
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={confirmSale}
                disabled={!canSubmit}
                className="mt-4 w-full rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Procesando..." : "Confirmar venta"}
              </button>
            </article>
          </div>
        </section>
      </div>
      </div>
    </PermissionGuard>
  )
}
