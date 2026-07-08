"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useCart } from "./use-cart"
import { useProductSearch } from "./use-product-search"

export function usePosCart() {
  const { defaultLocation } = useAuth()

  const products = useProductSearch(defaultLocation?.location_id)
  const cart = useCart()

  const {
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    selectedSizeCode,
    setSelectedSizeCode,
    selectedColorCode,
    setSelectedColorCode,
    selectedVariant,
    searchableStyles,
    pricingModeOverride,
    setPricingModeOverride,
    error: productError,
    selectProductStyle: rawSelectProductStyle,
  } = products

  const {
    cart: cartItems,
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
  } = cart

  return {
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    selectedSizeCode,
    setSelectedSizeCode,
    selectedColorCode,
    setSelectedColorCode,
    selectedVariant,
    searchableStyles,
    pricingModeOverride,
    setPricingModeOverride,
    productError,
    rawSelectProductStyle,
    cartItems,
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