import type { CartItem, PreviewItem, SalePreview, SearchableStyle, PaymentDraft, PosContext, SaleDiscountState, PosCustomer, MixedPaymentPreview, SaleVariant } from "./pos-types"

export type Stage = "products" | "customer" | "payment" | "summary"

export type ProductStageProps = {
  active: boolean
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
  selectedSizeCode: string
  setSelectedSizeCode: (v: string) => void
  selectedColorCode: string
  setSelectedColorCode: (v: string) => void
  sizeSelectOptions: { value: string; label: string }[]
  colorSelectOptions: { value: string; label: string }[]
  selectedVariant: SaleVariant | null
  previewWholesaleApplies: boolean
  selectedVariantAutoPrice: number | null | undefined
  cart: CartItem[]
  totals: SalePreview
  addToCart: (variant: SaleVariant) => void
  updateQty: (id: string, delta: number) => void
  removeFromCart: (id: string) => void
  openPriceSheet: (item: PreviewItem) => void
  clearPriceAdjustment: (id: string) => void
  posContext: PosContext | null
  defaultLocation: { location_id: string } | null
  productSearchInputRef: React.RefObject<HTMLInputElement | null>
  productSectionRef: React.RefObject<HTMLElement | null>
  onActivate: () => void
}

export type CustomerStageProps = {
  active: boolean
  documentType: string
  setDocumentType: (v: string) => void
  documentPickerOpen: boolean
  setDocumentPickerOpen: (v: boolean) => void
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
  genericCustomer: PosCustomer | null
  isGenericCustomerSelected: boolean
  customerStepReady: boolean
  customerIsValid: boolean
  canEditSelectedCustomer: boolean
  activeDocumentOption: { label: string; value: string } | null
  selectedCustomerName: string
  selectedCustomerDocument: string
  openCustomerSheet: (mode: "create" | "edit") => void
  goToPayment: () => void
  customerSearchInputRef: React.RefObject<HTMLInputElement | null>
  customerSectionRef: React.RefObject<HTMLElement | null>
  documentPickerRef: React.RefObject<HTMLDivElement | null>
  onActivate: () => void
}

export type PaymentStageProps = {
  active: boolean
  activeDocumentOption: CustomerStageProps["activeDocumentOption"]
  cartCount: number
  totals: ProductStageProps["totals"]
  saleDiscount: SaleDiscountState
  saleDiscountError: string | null
  saleDiscountTargetTotal: number
  setDiscountModalOpen: (v: boolean) => void
  paymentMode: "single" | "mixed"
  setPaymentModeWithDefaults: (mode: "single" | "mixed") => void
  paymentMethod: string
  setPaymentMethod: (v: string) => void
  mixedPayments: PaymentDraft[]
  mixedPaymentsPreview: MixedPaymentPreview | null
  updateMixedPaymentDraft: (id: string, field: "method" | "amountValue" | "reference", value: string) => void
  addMixedPaymentDraft: () => void
  removeMixedPaymentDraft: (id: string) => void
  onActivate: () => void
}

export type SummaryStageProps = {
  active: boolean
  activeDocumentOption: CustomerStageProps["activeDocumentOption"]
  selectedCustomerName: string
  selectedCustomerDocument: string
  selectedCustomer: PosCustomer | null
  isGenericCustomerSelected: boolean
  customerStepReady: boolean
  cartCount: number
  totals: ProductStageProps["totals"]
  paymentMode: PaymentStageProps["paymentMode"]
  paymentSummaryLabel: string
  mixedPaymentsPreview: PaymentStageProps["mixedPaymentsPreview"]
  mixedPayments: PaymentStageProps["mixedPayments"]
  cashReady: boolean
  cashStatus: string
  canOpenCashModule: boolean
  posContext: PosContext | null
  summaryStatusMessage: string | null
  submitDisabled: boolean
  submitting: boolean
  error: string | null
  goToStage: (stage: Stage) => void
  confirmSale: () => void
  onActivate: () => void
}
