"use client"

import { useMemo, useState } from "react"
import {
    CirclePlus,
    Minus,
    Search,
    ShoppingBasket,
    Trash2,
} from "lucide-react"

import { DropdownButtom } from "@/components/ui/Dropdown-buttom"
import { ProceedButton } from "@/components/ui/proceed-button"
import { CashRegisterStatus } from "@/components/ui/purchase-system/CashRegisterStatus"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"

const PRODUCTS = [
    { name: "Polo Essentials", sku: "RIP-001", stock: 25, price: 89.9, category: "Ropa" },
    { name: "Jean Urban Flex", sku: "RIP-013", stock: 14, price: 159.0, category: "Ropa" },
    { name: "Zapatilla Runner Pro", sku: "RIP-222", stock: 8, price: 259.9, category: "Calzado" },
    { name: "Casaca Softshell", sku: "RIP-330", stock: 6, price: 229.0, category: "Ropa" },
    { name: "Mochila City Light", sku: "RIP-411", stock: 16, price: 119.5, category: "Accesorios" },
]

const SIZE_OPTIONS = [
    { value: "S", label: "S" },
    { value: "M", label: "M" },
    { value: "L", label: "L" },
    { value: "XL", label: "XL" },
]

const COLOR_OPTIONS = [
    { value: "Negro", label: "Negro" },
    { value: "Blanco", label: "Blanco" },
    { value: "Rojo", label: "Rojo" },
    { value: "Azul", label: "Azul" },
    { value: "Verde", label: "Verde" },
    { value: "Amarillo", label: "Amarillo" },
    { value: "Naranja", label: "Naranja" },
]

export default function PurchaseSystem() {

    const [query, setQuery] = useState("")
    const [selectedSku, setSelectedSku] = useState(PRODUCTS[0].sku)
    const [size, setSize] = useState("M")
    const [color, setColor] = useState("Negro")
    const [quantity, setQuantity] = useState(1)
    const [cart, setCart] = useState([])

    const filteredProducts = useMemo(() => {
        if (!query.trim()) return PRODUCTS
        const normalizedQuery = query.toLowerCase()
        return PRODUCTS.filter(
            (product) =>
                product.name.toLowerCase().includes(normalizedQuery) ||
                product.sku.toLowerCase().includes(normalizedQuery) ||
                product.category.toLowerCase().includes(normalizedQuery)
        )
    }, [query])

    const selectedProduct = useMemo(
        () => PRODUCTS.find((product) => product.sku === selectedSku) || PRODUCTS[0],
        [selectedSku]
    )

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

    const addToCart = () => {
        if (!selectedProduct || quantity < 1) return

        const clampedQuantity = Math.min(quantity, selectedProduct.stock)
        const variantKey = `${selectedProduct.sku}-${size}-${color}`

        setCart((current) => {
            const existing = current.find((item) => item.variantKey === variantKey)
            if (!existing) {
                return [
                    ...current,
                    {
                        variantKey,
                        sku: selectedProduct.sku,
                        name: selectedProduct.name,
                        price: selectedProduct.price,
                        size,
                        color,
                        quantity: clampedQuantity,
                    },
                ]
            }

            return current.map((item) =>
                item.variantKey === variantKey
                    ? {
                            ...item,
                            quantity: Math.min(item.quantity + clampedQuantity, selectedProduct.stock),
                        }
                    : item
            )
        })
    }

    const updateCartQuantity = (variantKey, delta) => {
        setCart((current) =>
            current
                .map((item) => {
                    if (item.variantKey !== variantKey) return item
                    return { ...item, quantity: Math.max(1, item.quantity + delta) }
                })
                .filter((item) => item.quantity > 0)
        )
    }

    const removeFromCart = (variantKey) => {
        setCart((current) => current.filter((item) => item.variantKey !== variantKey))
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <PosHeader currentStep={0} />

                <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr_1fr]">
                    <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Search className="h-4 w-4" />
                            Busqueda rapida de productos
                        </h2>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Nombre, SKU o categoria"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400"
                                />
                                <button
                                    type="button"
                                    className="rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-700"
                                    aria-label="Buscar"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1">
                                {filteredProducts.map((product) => (
                                    <button
                                        key={product.sku}
                                        type="button"
                                        onClick={() => setSelectedSku(product.sku)}
                                        className={`rounded-xl border px-3 py-2 text-left transition ${
                                            selectedSku === product.sku
                                                ? "border-violet-300 bg-violet-50"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {product.sku} | Stock: {product.stock} | S/. {product.price.toFixed(2)}
                                        </p>
                                    </button>
                                ))}
                                {!filteredProducts.length && (
                                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                                        No hay coincidencias para la busqueda actual.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{selectedProduct.sku}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock disponible</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{selectedProduct.stock} unidades</p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <DropdownButtom
                                key={`size-${selectedProduct.sku}`}
                                id="purchase-size"
                                label="Talla"
                                defaultValue={size}
                                onValueChange={setSize}
                                options={SIZE_OPTIONS}
                                className="mt-0"
                            />
                            <DropdownButtom
                                key={`color-${selectedProduct.sku}`}
                                id="purchase-color"
                                label="Color"
                                defaultValue={color}
                                onValueChange={setColor}
                                options={COLOR_OPTIONS}
                                className="mt-0"
                            />
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-700">Cantidad</p>
                            <div className="mt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                                    className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                                    aria-label="Disminuir cantidad"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    max={selectedProduct.stock}
                                    value={quantity}
                                    onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQuantity((current) => Math.min(selectedProduct.stock, current + 1))}
                                    className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                                    aria-label="Aumentar cantidad"
                                >
                                    <CirclePlus className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={addToCart}
                                    className="ml-auto rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                                >
                                    Agregar a orden
                                </button>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <ShoppingBasket className="h-4 w-4" />
                            Orden actual
                        </h2>

                        <div className="space-y-2">
                            {cart.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                                    No hay productos agregados todavia.
                                </p>
                            )}

                            {cart.map((item) => (
                                <div key={item.variantKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {item.sku} | {item.size} | {item.color}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.variantKey)}
                                            className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Eliminar item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateCartQuantity(item.variantKey, -1)}
                                                className="rounded-md border border-slate-300 p-1"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="text-sm font-medium text-slate-700">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateCartQuantity(item.variantKey, 1)}
                                                className="rounded-md border border-slate-300 p-1"
                                            >
                                                <CirclePlus className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">S/. {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>

                    <CashRegisterStatus
                        totalItems={totalItems}
                        subtotal={subtotal}
                        onClear={() => setCart([])}
                    />
                </section>

                <section className="sticky bottom-3 z-10 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Total parcial de la compra</p>
                            <p className="text-2xl font-bold text-slate-900">S/. {subtotal.toFixed(2)}</p>
                        </div>
                        <ProceedButton 
                            text="Proceder a registrar datos del cliente"
                            className="w-full justify-center md:w-auto" 
                            link="/purchase-system/checkout"
                        />
                    </div>
                </section>
            </div>
        </div>
    )
}