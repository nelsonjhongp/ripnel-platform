import type { CartItem, PreviewItem, SalePreview, SearchableStyle, PaymentDraft, PosContext, PosCustomer, MixedPaymentPreview, SaleVariant, PriceModeOverride, Stage } from "./pos-types"

export type ProductStageProps = {
  pulseStage?: Stage | null
  query: string
  setQuery: (v: string) => void
  searchableStyles: SearchableStyle[]
  loadingVariants: boolean
  productPickerOpen: boolean
  setProductPickerOpen: (v: boolean) => void
  highlightedProductIndex: number
  setHighlightedProductIndex: (v: number) => void
  selectedProductStyle: SearchableStyle | null
  selectProductStyle: (style: SearchableStyle | null) => void
  previewWholesaleApplies: boolean
  cart: CartItem[]
  totals: SalePreview
  addToCart: (variant: SaleVariant, quantity?: number) => void
  updateQty: (id: string, delta: number) => void
  removeFromCart: (id: string) => void
  openPriceSheet: (item: PreviewItem) => void
  clearPriceAdjustment: (id: string) => void
  posContext: PosContext | null
  defaultLocation: { location_id: string } | null
  productSearchInputRef: React.RefObject<HTMLInputElement | null>
  productSectionRef: React.RefObject<HTMLElement | null>
  pricingModeOverride: PriceModeOverride
  setPricingModeOverride: (value: PriceModeOverride) => void
}

export type CustomerStageProps = {
  pulseStage?: Stage | null
  documentType: string
  setDocumentType: (v: string) => void
  customerQuery: string
  setCustomerQuery: (v: string) => void
  customerResults: PosCustomer[]
  loadingCustomers: boolean
  customerPickerOpen: boolean
  setCustomerPickerOpen: (v: boolean) => void
  highlightedCustomerIndex: number
  setHighlightedCustomerIndex: (v: number) => void
  selectedCustomer: PosCustomer | null
  selectCustomer: (c: PosCustomer | null) => void
  customerStepReady: boolean
  customerIsValid: boolean
  canEditSelectedCustomer: boolean
  activeDocumentOption: { label: string; value: string } | null
  selectedCustomerName: string
  selectedCustomerDocument: string
  openCustomerDialog: (mode: "create" | "edit") => void
  goToPayment?: () => void
  customerSearchInputRef: React.RefObject<HTMLInputElement | null>
  customerSectionRef: React.RefObject<HTMLElement | null>
}

export type PaymentStageProps = {
  pulseStage?: Stage | null
  cartCount: number
  totals: ProductStageProps["totals"]
  openDiscountModal: () => void
  paymentMode: "single" | "mixed"
  setPaymentModeWithDefaults: (mode: "single" | "mixed") => void
  paymentMethod: string
  setPaymentMethod: (v: string) => void
  singleReference: string
  setSingleReference: (v: string) => void
  mixedPayments: PaymentDraft[]
  mixedPaymentsPreview: MixedPaymentPreview | null
  updateMixedPaymentDraft: (id: string, field: "method" | "amount" | "reference", value: string) => void
  addMixedPaymentDraft: () => void
  removeMixedPaymentDraft: (id: string) => void
  paymentSectionRef: React.RefObject<HTMLElement | null>
}

export type SummaryStageProps = {
  activeDocumentOption: CustomerStageProps["activeDocumentOption"]
  selectedCustomerName: string
  selectedCustomerDocument: string
  documentType: string
  customerStepReady: boolean
  cartCount: number
  totals: ProductStageProps["totals"]
  paymentMode: PaymentStageProps["paymentMode"]
  paymentMethod: string
  paymentSummaryLabel: string
  mixedPaymentsPreview: PaymentStageProps["mixedPaymentsPreview"]
  mixedPayments: PaymentStageProps["mixedPayments"]
  cashReady: boolean
  cashStatus: string
  submitDisabled: boolean
  submitting: boolean
  error: string | null
  goToStage: (stage: Stage) => void
  onReviewSale: () => void
}
