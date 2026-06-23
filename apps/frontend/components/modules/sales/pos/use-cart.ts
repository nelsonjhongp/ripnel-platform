"use client"

import { useMemo, useState } from "react"
import { showError } from "@/lib/toast"
import type { CartItem, PreviewItem, SaleVariant } from "./pos-types"
import { POS } from "./pos-messages"

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [priceSheetOpen, setPriceSheetOpen] = useState(false)
  const [priceTargetId, setPriceTargetId] = useState<string | null>(null)
  const [pendingRemoveVariantId, setPendingRemoveVariantId] = useState<string | null>(null)

  function addToCart(variant: SaleVariant, quantity = 1) {
    const hasPrice =
      variant.retail_price !== null ||
      variant.wholesale_price !== null
    const availableStock = Number(variant.stock || 0)
    if (!hasPrice) {
      showError(POS.toast.cartNoPriceTitle, POS.toast.cartNoPriceDesc)
      return
    }
    if (availableStock <= 0) {
      showError(POS.toast.cartNoStockTitle, POS.toast.cartNoStockDesc)
      return
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.variant_id === variant.variant_id,
      )
      if (existingItem) {
        return currentCart.map((item) =>
          item.variant_id === variant.variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, availableStock),
                retail_price: variant.retail_price,
                wholesale_price: variant.wholesale_price,
                stock: availableStock,
                size_name: variant.size_name,
                color_name: variant.color_name,
              }
            : item,
        )
      }

      return [
        ...currentCart,
        {
          variant_id: variant.variant_id,
          sku: variant.sku,
          style_name: variant.style_name,
          size_code: variant.size_code,
          size_name: variant.size_name,
          color_code: variant.color_code,
          color_name: variant.color_name,
          label: `${variant.style_name} - ${variant.size_name || variant.size_code} / ${variant.color_name || variant.color_code}`,
          quantity: Math.min(Math.max(quantity, 1), availableStock),
          retail_price: variant.retail_price,
          wholesale_price: variant.wholesale_price,
          stock: availableStock,
          price_override: null,
        },
      ]
    })
  }

  function updateQty(variantId: string, delta: number) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.variant_id !== variantId) return item
        const nextQuantity = Math.max(1, Math.min(item.stock, item.quantity + delta))
        return { ...item, quantity: nextQuantity }
      }),
    )
  }

  function removeFromCart(variantId: string) {
    setPendingRemoveVariantId(variantId)
  }

  function closeRemoveItemConfirm() {
    setPendingRemoveVariantId(null)
  }

  function confirmRemoveFromCart() {
    const variantId = pendingRemoveVariantId
    if (!variantId) return
    setCart((currentCart) =>
      currentCart.filter((item) => item.variant_id !== variantId),
    )
    if (priceTargetId === variantId) {
      setPriceSheetOpen(false)
      setPriceTargetId(null)
    }
    closeRemoveItemConfirm()
  }

  function openPriceSheet(item: PreviewItem) {
    setPriceTargetId(item.variant_id)
    setPriceSheetOpen(true)
  }

  function closePriceSheet() {
    setPriceSheetOpen(false)
    setPriceTargetId(null)
  }

  function submitPriceAdjustment(
    variantId: string,
    unitPriceFinal: number,
    reason: string,
  ) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId
          ? {
              ...item,
              price_override: {
                unit_price_final: unitPriceFinal,
                reason,
              },
            }
          : item,
      ),
    )
  }

  function clearPriceAdjustment(variantId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId ? { ...item, price_override: null } : item,
      ),
    )
    if (priceTargetId === variantId) closePriceSheet()
  }

  const cartCount = cart.reduce((accumulator, item) => accumulator + item.quantity, 0)

  const priceTargetItem = useMemo(
    () => cart.find((item) => item.variant_id === priceTargetId) || null,
    [cart, priceTargetId],
  )

  const pendingRemoveItem = useMemo(
    () => cart.find((item) => item.variant_id === pendingRemoveVariantId) || null,
    [cart, pendingRemoveVariantId],
  )

  return {
    cart,
    setCart,
    cartCount,
    priceSheetOpen,
    priceTargetId,
    priceTargetItem,
    pendingRemoveVariantId,
    pendingRemoveItem,
    addToCart,
    updateQty,
    removeFromCart,
    closeRemoveItemConfirm,
    confirmRemoveFromCart,
    openPriceSheet,
    closePriceSheet,
    submitPriceAdjustment,
    clearPriceAdjustment,
  }
}
