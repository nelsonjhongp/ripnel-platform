"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  BadgeCheck,
  CircleAlert,
  CreditCard,
  History,
  Info,
  LoaderCircle,
  MapPin,
  Receipt,
  ShieldAlert,
  ShoppingBasket,
  Users,
  X,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton"
import { OpsPageShell } from "@/components/ui/ops-page-shell"

const ProductStage = dynamic(() => import("./stage-products").then((m) => m.ProductStage), {
  ssr: false,
  loading: () => <StageSkeleton />,
})
const CustomerStage = dynamic(() => import("./stage-customer").then((m) => m.CustomerStage), {
  ssr: false,
  loading: () => <StageSkeleton />,
})
const PaymentStage = dynamic(() => import("./stage-payment").then((m) => m.PaymentStage), {
  ssr: false,
  loading: () => <StageSkeleton />,
})
const SummaryStage = dynamic(() => import("./stage-summary").then((m) => m.SummaryStage), {
  ssr: false,
  loading: () => <StageSkeleton />,
})

function StageSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--ops-border-strong)] p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { SalesWizardRail } from "@/components/ui/purchase-system/SalesWizardRail";
import { Button } from "@/components/ui/button";
import { OpsSelectMenu } from "@/components/ui/ops-selection";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut";
import { showSuccess, showError } from "@/lib/toast";

import {
  DOC_TYPES,
  PAYMENT_METHODS,
  GENERIC_CUSTOMER_CODE,
  SALE_DISCOUNT_REASON_OPTIONS,
} from "./pos-types";
import type {
  CartItem,
  ConfirmedSale,
  CustomerFormState,
  PaymentDraft,
  PosContext,
  PosCustomer,
  PreviewItem,
  PriceFormState,
  SaleDiscountState,
  SaleVariant,
  SearchableStyle,
  Stage,
} from "./pos-types";

import {
  round2,
  trimOrNull,
  formatMoney,
  parseAmountInput,
  buildSemanticChipClass,
  createPaymentDraft,
  createDefaultMixedPayments,
  buildCustomerDisplayName,
  buildCustomerDocument,
  shouldApplyWholesalePreview,
  calculateSalePreview,
  buildCashLabel,
  buildCashTone,
  getPaymentMethodLabel,
  isCustomerValidForDocumentType,
  getCustomerSearchFilter,
  filterCustomersByDocumentType,
  groupVariantsByStyle,
  buildProductSearchResults,
  getVariantOptionValues,
  findVariantByAttributes,
  explainApiError,
  createEmptyCustomerForm,
  buildCustomerFormFromCustomer,
  validateCustomerForm,
  buildCustomerPayload,
  replaceCustomerInResults,
} from "./pos-utils";

import { INPUT_CLASS, COMPACT_LABEL_CLASS } from "./pos-constants";

export default function NuevaVentaPage() {
  const { defaultLocation, locationsLoading, has } = useAuth();
  const wizardViewportRef = useRef<HTMLDivElement | null>(null);
  const customerSectionRef = useRef<HTMLElement | null>(null);
  const productSectionRef = useRef<HTMLElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const documentPickerRef = useRef<HTMLDivElement | null>(null);
  const stageOrder: Stage[] = ["products", "customer", "payment", "summary"];

  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<SaleVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0);
  const [selectedProductStyle, setSelectedProductStyle] =
    useState<SearchableStyle | null>(null);
  const [selectedSizeCode, setSelectedSizeCode] = useState("");
  const [selectedColorCode, setSelectedColorCode] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [documentType, setDocumentType] = useState("none");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentMode, setPaymentMode] = useState<"single" | "mixed">("single");
  const [mixedPayments, setMixedPayments] = useState<PaymentDraft[]>(() =>
    createDefaultMixedPayments(0, "cash"),
  );
  const [saleDiscount, setSaleDiscount] = useState<SaleDiscountState>({
    mode: "none",
    value: "",
    reason: "",
  })

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [genericCustomer, setGenericCustomer] = useState<PosCustomer | null>(
    null,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(
    null,
  );

  const [posContext, setPosContext] = useState<PosContext | null>(null);
  const [posContextLoading, setPosContextLoading] = useState(false);
  const [posContextError, setPosContextError] = useState<string | null>(null);

  const [customerSheetOpen, setCustomerSheetOpen] = useState(false)
  const [customerSheetMode, setCustomerSheetMode] = useState("create")
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(createEmptyCustomerForm())
  const [customerFormError, setCustomerFormError] = useState<string | null>(null)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [priceSheetOpen, setPriceSheetOpen] = useState(false)
  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [priceTargetId, setPriceTargetId] = useState<string | null>(null)
  const [priceForm, setPriceForm] = useState<PriceFormState>({
    unit_price_final: "",
    reason: "",
  });
  const [priceFormError, setPriceFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSale | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>("products");

  const refreshPosContext = useCallback(async () => {
    if (!defaultLocation?.location_id) {
      setPosContext(null);
      setPosContextError(null);
      return;
    }

    setPosContextLoading(true);
    setPosContextError(null);

    try {
      const context = (await apiFetch("/api/sales/context", {
        cache: "no-store",
      })) as PosContext;
      setPosContext(context);
    } catch (fetchError) {
      setPosContext(null);
      setPosContextError(
        explainApiError(fetchError, "No se pudo validar la caja operativa."),
      );
    } finally {
      setPosContextLoading(false);
    }
  }, [defaultLocation?.location_id]);

  const refreshGenericCustomer = useCallback(async () => {
    try {
      const response = await apiFetch(
        `/api/customers?q=${encodeURIComponent(GENERIC_CUSTOMER_CODE)}`,
      );
      const customers = unwrapApiData(response);
      const generic =
        (Array.isArray(customers) ? customers : []).find(
          (customer) => customer.internal_code === GENERIC_CUSTOMER_CODE,
        ) || null;

      setGenericCustomer(generic);
    } catch {
      setGenericCustomer(null);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => refreshGenericCustomer());
  }, [refreshGenericCustomer]);

  useEffect(() => {
    if (cart.length === 0) return
    function warnBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [cart.length]);

  useKeyboardShortcuts([
    { key: "F2", handler: () => productSearchInputRef.current?.focus(), enabled: !submitting },
    { key: "F4", handler: () => customerSearchInputRef.current?.focus(), enabled: !submitting },
    { key: "F8", handler: () => { if (!submitDisabled) confirmSale() }, enabled: !submitting },
    { key: "Escape", handler: () => { if (productPickerOpen) setProductPickerOpen(false); if (customerPickerOpen) setCustomerPickerOpen(false); }, enabled: true },
  ]);

  useEffect(() => {
    if (!defaultLocation?.location_id) {
      void Promise.resolve().then(() => {
        setVariants([]);
        setProductPickerOpen(false);
        setSelectedProductStyle(null);
        setSelectedSizeCode("");
        setSelectedColorCode("");
      });
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingVariants(true);

      try {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set("q", query.trim());
        }

        const path = params.toString()
          ? `/api/sales/sellable-variants?${params.toString()}`
          : "/api/sales/sellable-variants";
        const response = await apiFetch(path);
        const nextVariants = Array.isArray(response) ? response : [];

        if (!active) return;

        setError(null);
        setVariants(nextVariants);
      } catch (fetchError) {
        if (!active) return;
        setVariants([]);
        setError(
          explainApiError(fetchError, "No se pudieron cargar productos."),
        );
      } finally {
        if (active) {
          setLoadingVariants(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [defaultLocation?.location_id, query]);

  useEffect(() => {
    void Promise.resolve().then(() => refreshPosContext());
  }, [refreshPosContext]);

  useEffect(() => {
    const normalizedCustomerQuery = customerQuery.trim();
    if (!customerPickerOpen && !normalizedCustomerQuery) {
      void Promise.resolve().then(() => {
        setCustomerResults([]);
        setLoadingCustomers(false);
      });
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(
      async () => {
        setLoadingCustomers(true);

        try {
          const params = new URLSearchParams();
          if (normalizedCustomerQuery) {
            params.set("q", normalizedCustomerQuery);
          }

          const { queryDocumentType } = getCustomerSearchFilter(documentType);
          if (queryDocumentType) {
            params.set("document_type", queryDocumentType);
          }

          const path = params.toString()
            ? `/api/customers?${params.toString()}`
            : "/api/customers";
          const response = await apiFetch(path);
          const customers = unwrapApiData(response);
          const compatibleCustomers = filterCustomersByDocumentType(
            Array.isArray(customers) ? customers : [],
            documentType,
          ).slice(0, normalizedCustomerQuery ? 12 : 24);

          if (active) {
            setCustomerResults(compatibleCustomers);
          }
        } catch {
          if (active) {
            setCustomerResults([]);
          }
        } finally {
          if (active) {
            setLoadingCustomers(false);
          }
        }
      },
      normalizedCustomerQuery ? 250 : 0,
    );

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [customerPickerOpen, customerQuery, documentType]);

  const styles = useMemo(() => groupVariantsByStyle(variants), [variants]);
  const catalogStyles = useMemo(
    () => buildProductSearchResults(styles, ""),
    [styles],
  );
  const searchableStyles = useMemo(
    () =>
      query.trim() ? buildProductSearchResults(styles, query) : catalogStyles,
    [catalogStyles, query, styles],
  );

  const sizeOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "size_code",
        selectedColorCode ? { color_code: selectedColorCode } : {},
      ),
    [selectedColorCode, selectedProductStyle],
  );

  const colorOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "color_code",
        selectedSizeCode ? { size_code: selectedSizeCode } : {},
      ),
    [selectedProductStyle, selectedSizeCode],
  );
  const sizeNameMap = useMemo(() => {
    const nextMap = new Map();
    for (const variant of selectedProductStyle?.variants || []) {
      const sizeCode = String(variant.size_code || "").trim();
      if (sizeCode && !nextMap.has(sizeCode)) {
        nextMap.set(sizeCode, variant.size_name || sizeCode);
      }
    }
    return nextMap;
  }, [selectedProductStyle]);
  const colorNameMap = useMemo(() => {
    const nextMap = new Map();
    for (const variant of selectedProductStyle?.variants || []) {
      const colorCode = String(variant.color_code || "").trim();
      if (colorCode && !nextMap.has(colorCode)) {
        nextMap.set(colorCode, variant.color_name || colorCode);
      }
    }
    return nextMap;
  }, [selectedProductStyle]);
  const sizeSelectOptions = useMemo(
    () =>
      sizeOptions.map((sizeCode) => ({
        value: sizeCode,
        label: sizeNameMap.get(sizeCode) || sizeCode,
        helper: sizeNameMap.get(sizeCode) !== sizeCode ? sizeCode : undefined,
      })),
    [sizeNameMap, sizeOptions],
  );
  const colorSelectOptions = useMemo(
    () =>
      colorOptions.map((colorCode) => ({
        value: colorCode,
        label: colorNameMap.get(colorCode) || colorCode,
        helper:
          colorNameMap.get(colorCode) !== colorCode ? colorCode : undefined,
      })),
    [colorNameMap, colorOptions],
  );

  const selectedVariant = useMemo(
    () =>
      findVariantByAttributes(
        selectedProductStyle?.variants || [],
        selectedSizeCode,
        selectedColorCode,
      ),
    [selectedColorCode, selectedProductStyle, selectedSizeCode],
  );
  const previewWholesaleApplies = useMemo(
    () => shouldApplyWholesalePreview(cart, posContext?.pricing),
    [cart, posContext?.pricing],
  );
  const selectedVariantAutoPrice =
    selectedVariant &&
    previewWholesaleApplies &&
    selectedVariant.wholesale_price !== null &&
    selectedVariant.wholesale_price !== undefined
      ? selectedVariant.wholesale_price
      : selectedVariant?.retail_price;


  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!searchableStyles.length) {
        setHighlightedProductIndex(0);
        return;
      }

      setHighlightedProductIndex((current) =>
        Math.min(Math.max(current, 0), searchableStyles.length - 1),
      );
    });
  }, [searchableStyles]);

  useEffect(() => {
    if (!documentPickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        documentPickerRef.current &&
        !documentPickerRef.current.contains(event.target as Node)
      ) {
        setDocumentPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [documentPickerOpen]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!customerResults.length) {
        setHighlightedCustomerIndex(0);
        return;
      }

      setHighlightedCustomerIndex((current) =>
        Math.min(Math.max(current, 0), customerResults.length - 1),
      );
    });
  }, [customerResults]);

  useEffect(() => {
    if (!selectedProductStyle?.style_id) {
      return;
    }

    const refreshedStyle =
      catalogStyles.find(
        (style) => style.style_id === selectedProductStyle.style_id,
      ) || null;

    if (refreshedStyle) {
      void Promise.resolve().then(() =>
        setSelectedProductStyle(refreshedStyle),
      );
    }
  }, [catalogStyles, selectedProductStyle?.style_id]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!selectedProductStyle) {
        setSelectedSizeCode("");
        setSelectedColorCode("");
        return;
      }

      setSelectedSizeCode((current) => {
        if (current && sizeOptions.includes(current)) {
          return current;
        }

        return sizeOptions.length === 1 ? sizeOptions[0] : "";
      });
    });
  }, [selectedProductStyle, sizeOptions]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!selectedProductStyle) {
        return;
      }

      setSelectedColorCode((current) => {
        if (current && colorOptions.includes(current)) {
          return current;
        }

        return colorOptions.length === 1 ? colorOptions[0] : "";
      });
    });
  }, [colorOptions, selectedProductStyle]);

  const totals = useMemo(
    () =>
      calculateSalePreview(
        cart,
        documentType,
        saleDiscount,
        posContext?.pricing,
      ),
    [cart, documentType, posContext?.pricing, saleDiscount],
  );

  const saleDiscountError = useMemo(() => {
    if (saleDiscount.mode === "none" || cart.length === 0) {
      return null
    }

    const discountValue = parseAmountInput(saleDiscount.value)
    if (discountValue === null || discountValue <= 0) {
      return "Ingresa un descuento valido."
    }

    if (saleDiscount.mode === "percent" && discountValue > 100) {
      return "El descuento porcentual no puede superar 100%."
    }

    if (saleDiscount.mode === "fixed" && discountValue > totals.baseSubtotal) {
      return "El descuento no puede superar el subtotal base."
    }

    if (totals.total <= 0) {
      return "El total final debe ser mayor a cero.";
    }

    if (!trimOrNull(saleDiscount.reason)) {
      return "Ingresa el motivo del descuento."
    }

    return null
  }, [cart.length, saleDiscount, totals.baseSubtotal, totals.total])

  const mixedPaymentsPreview = useMemo(() => {
    if (paymentMode !== "mixed") {
      return {
        payments: [],
        enteredTotal: totals.total,
        difference: 0,
        error: null,
      };
    }

    const normalizedPayments = mixedPayments.map((payment) => ({
      ...payment,
      amountValue: parseAmountInput(payment.amount),
      methodIsValid: PAYMENT_METHODS.some(
        (method) => method.value === payment.method,
      ),
    }));
    const positivePayments = normalizedPayments.filter(
      (payment) => payment.amountValue !== null && payment.amountValue > 0,
    );
    const enteredTotal = round2(
      positivePayments.reduce(
        (accumulator, payment) => accumulator + (payment.amountValue as number),
        0,
      ),
    );
    const difference = round2(totals.total - enteredTotal);

    let errorMessage: string | null = null;

    if (cart.length > 0) {
      if (positivePayments.length < 2) {
        errorMessage = "Distribuye el cobro en al menos dos pagos.";
      } else if (normalizedPayments.some((payment) => !payment.methodIsValid)) {
        errorMessage = "Revisa los metodos del pago mixto.";
      } else if (
        normalizedPayments.some(
          (payment) =>
            String(payment.amount || "").trim() !== "" &&
            payment.amountValue === null,
        )
      ) {
        errorMessage = "Revisa los montos del pago mixto.";
      } else if (Math.abs(difference) >= 0.01) {
        errorMessage =
          difference > 0
            ? `Faltan S/. ${formatMoney(difference)} por asignar.`
            : `El pago excede el total por S/. ${formatMoney(Math.abs(difference))}.`;
      }
    }

    return {
      payments: positivePayments.map((payment) => ({
        method: payment.method,
        amount: payment.amountValue,
        reference: trimOrNull(payment.reference),
      })),
      enteredTotal,
      difference,
      error: errorMessage,
    };
  }, [cart.length, mixedPayments, paymentMode, totals.total]);

  const customerIsValid = isCustomerValidForDocumentType(
    selectedCustomer,
    documentType,
  );
  const cashReady = posContext?.cash?.sale_enabled === true;
  const cashStatus = posContext?.cash?.status || "missing";
  const cashOverlayVisible = Boolean(posContext && !cashReady);
  const canOpenCashModule = has("cash.operate");
  const priceTargetItem = useMemo(
    () => cart.find((item) => item.variant_id === priceTargetId) || null,
    [cart, priceTargetId],
  );
  const priceTargetPreviewItem = useMemo(
    () =>
      totals.items.find((item) => item.variant_id === priceTargetId) || null,
    [priceTargetId, totals.items],
  );
  const documentGuidance =
    documentType === "boleta"
      ? customerIsValid
        ? "Cliente listo para boleta con DNI o CE."
        : "Boleta requiere cliente con DNI o CE valido."
      : documentType === "factura"
        ? customerIsValid
          ? "Cliente listo para factura con RUC y direccion."
          : "Factura requiere RUC y direccion fiscal."
        : documentType === "proforma"
          ? "Proforma sin validacion fiscal obligatoria."
          : "Sin comprobante: no exige documento.";
  const summaryStatusMessage = (() => {
    if (!defaultLocation?.location_id) {
      return "Asigna una sede operativa antes de vender.";
    }

    if (posContextLoading) {
      return "Validando sede y caja operativa...";
    }

    if (!cashReady) {
      return (
        posContext?.cash?.message ||
        "La venta no se puede registrar hasta que se abra una caja"
      );
    }

    if (cart.length === 0) {
      return "Agrega al menos un producto.";
    }

    if (totals.hasMissingPrice) {
      return "Hay items sin precio vigente.";
    }

    if (saleDiscountError) {
      return saleDiscountError;
    }

    if (mixedPaymentsPreview.error) {
      return mixedPaymentsPreview.error;
    }

    if (!selectedCustomer) {
      return "Selecciona un cliente o confirma cliente mostrador.";
    }

    if (!customerIsValid) {
      return documentGuidance;
    }

    return "Venta lista para confirmar.";
  })();
  const submitDisabled =
    cart.length === 0 ||
    Boolean(confirmedSale) ||
    !defaultLocation?.location_id ||
    locationsLoading ||
    posContextLoading ||
    !cashReady ||
    totals.hasMissingPrice ||
    Boolean(saleDiscountError) ||
    Boolean(mixedPaymentsPreview.error) ||
    !customerIsValid ||
    submitting;

  const cartCount = cart.reduce(
    (accumulator, item) => accumulator + item.quantity,
    0,
  );
  const isGenericCustomerSelected =
    Boolean(genericCustomer?.customer_id) &&
    selectedCustomer?.customer_id === genericCustomer?.customer_id;
  const customerStepReady =
    Boolean(selectedCustomer?.customer_id) && customerIsValid;
  const paymentStepReady =
    customerStepReady &&
    cartCount > 0 &&
    !mixedPaymentsPreview.error &&
    !saleDiscountError;
  const canEditSelectedCustomer =
    Boolean(selectedCustomer?.customer_id) &&
    selectedCustomer?.customer_id !== genericCustomer?.customer_id;
  const activeDocumentOption =
    DOC_TYPES.find((docType) => docType.value === documentType) || DOC_TYPES[0];
  const paymentSummaryLabel =
    paymentMode === "mixed"
      ? `${mixedPaymentsPreview.payments.length || mixedPayments.length} lineas de pago`
      : getPaymentMethodLabel(paymentMethod);
  const nextRecommendedStage =
    cartCount === 0
      ? "products"
      : !customerStepReady
        ? "customer"
        : !paymentStepReady
          ? "payment"
          : "summary";
  const progressItems = [
    {
      id: "products",
      label: "Productos",
      icon: ShoppingBasket,
      active: activeStage === "products",
      complete: cartCount > 0,
      suggested: nextRecommendedStage === "products",
      meta:
        cartCount > 0
          ? `${cartCount} item${cartCount === 1 ? "" : "s"}`
          : "Agrega items",
    },
    {
      id: "customer",
      label: "Cliente",
      icon: Users,
      active: activeStage === "customer",
      complete: customerStepReady,
      suggested: nextRecommendedStage === "customer",
      meta: customerStepReady
        ? isGenericCustomerSelected
          ? "Mostrador"
          : "Confirmado"
        : !selectedCustomer
          ? "Pendiente"
          : customerIsValid
            ? "Seleccionado"
            : "Revisar",
    },
    {
      id: "payment",
      label: "Cobro",
      icon: CreditCard,
      active: activeStage === "payment",
      complete: paymentStepReady,
      suggested: nextRecommendedStage === "payment",
      meta: paymentStepReady ? paymentSummaryLabel : "Pendiente",
    },
    {
      id: "summary",
      label: "Resumen",
      icon: Receipt,
      active: activeStage === "summary",
      complete: false,
      suggested: nextRecommendedStage === "summary",
      meta: submitDisabled ? "Pendiente" : "Listo",
    },
  ];
  const stageRefs = {
    customer: customerSectionRef,
    products: productSectionRef,
    payment: paymentSectionRef,
    summary: summarySectionRef,
  };
  const currentStageIndex = stageOrder.indexOf(activeStage);
  const canGoPrevious = currentStageIndex > 0;
  const canGoNext = currentStageIndex < stageOrder.length - 1;
  const canAdvanceStage =
    activeStage === "products"
      ? cartCount > 0
      : activeStage === "customer"
        ? cartCount > 0 && customerStepReady
        : activeStage === "payment"
          ? paymentStepReady
          : false;
  const nextStageLabel =
    activeStage === "products"
      ? "Ir a cliente"
      : activeStage === "customer"
        ? "Ir a cobro"
        : activeStage === "payment"
          ? "Ir a resumen"
          : undefined
  const selectedCustomerName = buildCustomerDisplayName(selectedCustomer)
  const selectedCustomerDocument = buildCustomerDocument(selectedCustomer)
  const discountReasonSelection = SALE_DISCOUNT_REASON_OPTIONS.some(
    (option: { value: string }) => option.value === saleDiscount.reason
  )
    ? saleDiscount.reason
    : saleDiscount.reason
      ? "custom"
      : ""
  const saleDiscountTargetTotal = Math.max(round2(totals.baseSubtotal - totals.saleDiscountAmount), 0)

  function goToStage(stageId: Stage) {
    setActiveStage(stageId);
    requestAnimationFrame(() => {
      wizardViewportRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      stageRefs[stageId]?.current?.focus?.();
    });
  }

  function moveStage(direction: number) {
    const currentIndex = stageOrder.indexOf(activeStage);
    const nextIndex = Math.min(
      stageOrder.length - 1,
      Math.max(0, currentIndex + direction),
    );
    const nextStage = stageOrder[nextIndex];

    if (nextStage) {
      goToStage(nextStage);
    }
  }

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      void Promise.resolve().then(() =>
        setMixedPayments(
          createDefaultMixedPayments(totals.total, paymentMethod),
        ),
      );
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, totals.total]);

  function setPaymentModeWithDefaults(nextMode: "single" | "mixed") {
    setPaymentMode(nextMode);

    if (nextMode === "mixed") {
      setMixedPayments((current) =>
        current.length > 0
          ? current
          : createDefaultMixedPayments(totals.total, paymentMethod),
      );
    }
  }

  function updateMixedPaymentDraft(
    draftId: string,
    field: string,
    value: string,
  ) {
    setMixedPayments((current) => {
      const next = current.map((payment) =>
        payment.id === draftId ? { ...payment, [field]: value } : payment,
      );

      if (field !== "amount" || totals.total <= 0) {
        return next;
      }

      const editedIndex = next.findIndex((payment) => payment.id === draftId);
      const targetIndex = next.findIndex(
        (payment, index) =>
          index !== editedIndex &&
          (next.length === 2 ||
            String(payment.amount || "").trim() === "" ||
            Math.abs((parseAmountInput(payment.amount) || 0) - totals.total) <
              0.01),
      );

      if (targetIndex === -1) {
        return next;
      }

      const assignedWithoutTarget = next.reduce(
        (accumulator, payment, index) => {
          if (index === targetIndex) return accumulator;
          return accumulator + (parseAmountInput(payment.amount) || 0);
        },
        0,
      );
      const remaining = round2(totals.total - assignedWithoutTarget);

      return next.map((payment, index) =>
        index === targetIndex
          ? {
              ...payment,
              amount: remaining > 0 ? formatMoney(remaining) : "",
            }
          : payment,
      );
    });
  }

  function addMixedPaymentDraft() {
    setMixedPayments((current) => [
      ...current,
      createPaymentDraft("transfer", ""),
    ]);
  }

  function removeMixedPaymentDraft(draftId: string) {
    setMixedPayments((current) =>
      current.length <= 2
        ? current
        : current.filter((payment) => payment.id !== draftId),
    );
  }

  function openPriceSheet(item: PreviewItem) {
    setPriceTargetId(item.variant_id);
    setPriceForm({
      unit_price_final: String(
        item.price_override?.unit_price_final ??
          item.unit_price_list ??
          item.wholesale_price ??
          item.retail_price ??
          "",
      ),
      reason: item.price_override?.reason || "",
    });
    setPriceFormError(null);
    setPriceSheetOpen(true);
  }

  function closePriceSheet() {
    setPriceSheetOpen(false);
    setPriceTargetId(null);
    setPriceFormError(null);
    setPriceForm({
      unit_price_final: "",
      reason: "",
    });
  }

  function submitPriceAdjustment() {
    if (!priceTargetItem) {
      setPriceFormError("Selecciona un item valido.");
      return;
    }

    const nextUnitPrice = parseAmountInput(priceForm.unit_price_final);
    if (nextUnitPrice === null) {
      setPriceFormError("Ingresa un precio final valido.");
      return;
    }

    const reason = trimOrNull(priceForm.reason);
    if (!reason) {
      setPriceFormError("Ingresa el motivo del ajuste manual.");
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === priceTargetItem.variant_id
          ? {
              ...item,
              price_override: {
                unit_price_final: nextUnitPrice,
                reason,
              },
            }
          : item,
      ),
    );

    closePriceSheet();
  }

  function clearPriceAdjustment(variantId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId
          ? {
              ...item,
              price_override: null,
            }
          : item,
      ),
    );

    if (priceTargetId === variantId) {
      closePriceSheet();
    }
  }

  function addToCart(variant: SaleVariant) {
    const hasPrice =
      (variant.retail_price !== null && variant.retail_price !== undefined) ||
      (variant.wholesale_price !== null &&
        variant.wholesale_price !== undefined);
    const availableStock = Number(variant.stock || 0);

    if (!hasPrice || availableStock <= 0) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.variant_id === variant.variant_id,
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.variant_id === variant.variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, availableStock),
                retail_price: variant.retail_price,
                wholesale_price: variant.wholesale_price,
                stock: availableStock,
                size_name: variant.size_name,
                color_name: variant.color_name,
              }
            : item,
        );
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
          quantity: 1,
          retail_price: variant.retail_price,
          wholesale_price: variant.wholesale_price,
          stock: availableStock,
          price_override: null,
        },
      ];
    });
  }

  function updateQty(variantId: string, delta: number) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.variant_id !== variantId) {
          return item;
        }

        const nextQuantity = Math.max(
          1,
          Math.min(item.stock, item.quantity + delta),
        );
        return { ...item, quantity: nextQuantity };
      }),
    );
  }

  function removeFromCart(variantId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.variant_id !== variantId),
    );

    if (priceTargetId === variantId) {
      closePriceSheet();
    }
  }

  function selectProductStyle(style: SearchableStyle | null) {
    if (!style) {
      setSelectedProductStyle(null);
      setSelectedSizeCode("");
      setSelectedColorCode("");
      setQuery("");
      setHighlightedProductIndex(0);
      setProductPickerOpen(false);
      return;
    }
    setSelectedProductStyle(style);
    setSelectedSizeCode("");
    setSelectedColorCode("");
    setQuery("");
    setHighlightedProductIndex(0);
    setProductPickerOpen(false);
  }

  function selectCustomer(customer: PosCustomer | null) {
    setSelectedCustomer(customer);
    setCustomerQuery("");
    setCustomerResults([]);
    setHighlightedCustomerIndex(0);
    setCustomerPickerOpen(false);
  }

  function openCustomerSheet(mode: string) {
    setCustomerFormError(null);
    setCustomerSheetMode(mode);

    if (mode === "edit" && selectedCustomer) {
      setCustomerForm(buildCustomerFormFromCustomer(selectedCustomer));
    } else {
      setCustomerForm(
        createEmptyCustomerForm(
          documentType === "factura" ? "factura" : "retail",
        ),
      );
    }

    setCustomerSheetOpen(true);
  }

  function closeCustomerSheet() {
    setCustomerSheetOpen(false);
    setCustomerFormError(null);
    setCustomerSaving(false);
  }

  async function submitCustomerForm() {
    const validationError = validateCustomerForm(customerForm);
    if (validationError) {
      setCustomerFormError(validationError);
      return;
    }

    setCustomerSaving(true);
    setCustomerFormError(null);

    try {
      const payload = buildCustomerPayload(customerForm);
      const response =
        customerSheetMode === "edit" && selectedCustomer?.customer_id
          ? await apiFetch(`/api/customers/${selectedCustomer.customer_id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : await apiFetch("/api/customers", {
              method: "POST",
              body: JSON.stringify(payload),
            });

      const savedCustomer = unwrapApiData(response) as PosCustomer;

      setSelectedCustomer(savedCustomer);
      setCustomerResults((current) =>
        replaceCustomerInResults(current, savedCustomer),
      );

      if (savedCustomer.internal_code === GENERIC_CUSTOMER_CODE) {
        setGenericCustomer(savedCustomer);
      }

      setCustomerQuery("");
      closeCustomerSheet();
    } catch (submitError) {
      setCustomerFormError(
        explainApiError(submitError, "No se pudo guardar el cliente."),
      );
    } finally {
      setCustomerSaving(false);
    }
  }

  async function confirmSale() {
    if (submitDisabled) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        customer_id: selectedCustomer?.customer_id || null,
        document_type: documentType,
        items: cart.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          ...(item.price_override
            ? {
                price_override: {
                  unit_price_final: item.price_override.unit_price_final,
                  reason: item.price_override.reason,
                },
              }
            : {}),
        })),
      };

      if (totals.saleDiscountAmount > 0) {
        payload.sale_discount = {
          mode: saleDiscount.mode,
          value: parseAmountInput(saleDiscount.value),
          reason: trimOrNull(saleDiscount.reason),
        }
      }

      if (paymentMode === "mixed") {
        payload.payments = mixedPaymentsPreview.payments;
      } else {
        payload.payment_method = paymentMethod;
      }

      const sale = (await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as ConfirmedSale;

      setConfirmedSale({
        sale_id: sale.sale_id,
        sale_number: sale.sale_number,
      })
      setCustomerQuery("")
      setSelectedCustomer(genericCustomer)
      setDocumentType("none")
      setPaymentMethod("cash")
      setPaymentMode("single")
      setMixedPayments(createDefaultMixedPayments(0, "cash"))
      setSaleDiscount({
        mode: "none",
        value: "",
        reason: "",
      })
      setDiscountModalOpen(false)
      closePriceSheet()
      await refreshPosContext()
      showSuccess("Venta confirmada", sale.sale_number ? `#${sale.sale_number}` : "Exitosa")
    } catch (submitError) {
      setError(explainApiError(submitError, "No se pudo confirmar la venta."));
      showError("Error al confirmar venta", explainApiError(submitError, "Revisa los datos e intenta de nuevo."))
      await refreshPosContext();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ErrorBoundary>
      <PermissionGuard permission="sales.pos">
        <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
          <TooltipProvider delayDuration={120}>
            <OpsPageShell width="wide">
                <PosHeader
                  eyebrow="Punto de venta"
                  title="Nueva venta"
                  meta={
                    <>
                      <span className="sales-chip rounded-full px-3 py-1 text-xs font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />
                        {locationsLoading
                          ? "Cargando sede..."
                          : defaultLocation?.name || "Sin sede asignada"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          posContextLoading
                            ? "sales-chip"
                            : buildCashTone(cashStatus)
                        }`}
                      >
                        {posContextLoading ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {posContextLoading
                          ? "Validando caja"
                          : buildCashLabel(cashStatus)}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                            aria-label="Reglas del punto de venta"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}>
                          La venta solo se confirma si la caja esta operativa,
                          hay stock y existe un precio vigente.
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                          >
                            <Link href="/clientes" aria-label="Ir a clientes">
                              <Users className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}>
                          Clientes
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                          >
                            <Link
                              href={appRoutes.transactionHistory}
                              aria-label="Ir al historial de ventas"
                            >
                              <History className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}>
                          Historial
                        </TooltipContent>
                      </Tooltip>
                    </>
                  }
                />

                {!defaultLocation?.location_id && !locationsLoading ? (
                  <InlineStatusCard
                    title="No hay sede operativa activa"
                    description="Debes tener una sede default asignada para registrar ventas. Configurala desde tu cuenta o solicita apoyo al administrador."
                    tone="warning"
                    icon={<MapPin className="h-5 w-5" />}
                  />
                ) : null}

                {confirmedSale ? (
                  <div
                    className={`rounded-lg border p-4 shadow-sm ${buildSemanticChipClass("success")}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <BadgeCheck className="h-6 w-6 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          Venta confirmada: {confirmedSale.sale_number}
                        </p>
                        <p className="text-sm">
                          La venta quedo registrada y el stock ya fue
                          descontado.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={buildSaleDetailRoute(confirmedSale.sale_id)}
                          className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                        >
                          Ver detalle
                        </Link>
                        <Link
                          href={`/api/sales/${confirmedSale.sale_id}/receipt-pdf`}
                          target="_blank"
                          className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                          onClick={(e) => {
                            e.preventDefault()
                            const w = window.open(`/api/sales/${confirmedSale.sale_id}/receipt-pdf`, "_blank")
                            if (w) {
                              w.onload = () => { w.print() }
                            }
                          }}
                        >
                          Imprimir
                        </Link>
                        {has("sales.postsale.view") ? (
                          <Link
                            href={`/postventa/${confirmedSale.sale_id}`}
                            className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                          >
                            Ir a postventa
                          </Link>
                        ) : null}
                        <a
                          href={`/api/sales/${confirmedSale.sale_id}/receipt-pdf`}
                          download
                          className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                        >
                          Descargar PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmedSale(null)}
                          className="rounded-lg bg-[var(--ripnel-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--ripnel-accent-hover)]"
                        >
                          Nueva venta
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {posContextError ? (
                  <InlineStatusCard
                    title="No pudimos validar el contexto de venta"
                    description={posContextError}
                    tone="warning"
                    icon={<ShieldAlert className="h-5 w-5" />}
                  />
                ) : null}

                <div ref={wizardViewportRef}>
                  <SalesWizardRail
                    items={progressItems}
                    currentStep={currentStageIndex}
                    onSelect={(stageId) => goToStage(stageId as Stage)}
                    onPrevious={() => moveStage(-1)}
                    onNext={() => moveStage(1)}
                    canGoPrevious={canGoPrevious}
                    canGoNext={canGoNext}
                    canAdvance={canAdvanceStage}
                    nextLabel={nextStageLabel}
                  />
                </div>

                <div className="relative">
                  {cashOverlayVisible ? (
                    <div className="ops-overlay-backdrop absolute inset-0 z-20 flex items-center justify-center rounded-[28px] p-4">
                      <div className="ops-overlay-panel w-full max-w-md rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ops-tone-warning-text)]" />
                          <div className="space-y-2">
                            <p className="text-lg font-semibold">
                              Venta bloqueada por caja
                            </p>
                            <p className="text-sm leading-6 text-[var(--ops-text-muted)]">
                              {posContext?.cash?.message ||
                                "No pudimos validar la caja operativa de esta sede."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {canOpenCashModule ? (
                            <Button
                              asChild
                              variant="accent"
                              size="sm"
                              className="h-9 rounded-xl px-4"
                            >
                              <Link href="/caja">Ir a caja del dia</Link>
                            </Button>
                          ) : (
                            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-2.5 text-sm text-[var(--ops-text-muted)]">
                              Coordina con caja o con un administrador para
                              habilitar la venta.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px]">
                    <ProductStage
                      active={activeStage === "products"}
                      query={query}
                      setQuery={setQuery}
                      searchableStyles={searchableStyles}
                      loadingVariants={loadingVariants}
                      productPickerOpen={productPickerOpen}
                      setProductPickerOpen={setProductPickerOpen}
                      highlightedProductIndex={highlightedProductIndex}
                      setHighlightedProductIndex={setHighlightedProductIndex}
                      selectedProductStyle={selectedProductStyle}
                      selectProductStyle={selectProductStyle}
                      selectedSizeCode={selectedSizeCode}
                      setSelectedSizeCode={setSelectedSizeCode}
                      selectedColorCode={selectedColorCode}
                      setSelectedColorCode={setSelectedColorCode}
                      sizeSelectOptions={sizeSelectOptions}
                      colorSelectOptions={colorSelectOptions}
                      selectedVariant={selectedVariant}
                      previewWholesaleApplies={previewWholesaleApplies}
                      selectedVariantAutoPrice={selectedVariantAutoPrice}
                      cart={cart}
                      totals={totals}
                      addToCart={addToCart}
                      updateQty={updateQty}
                      removeFromCart={removeFromCart}
                      openPriceSheet={openPriceSheet}
                      clearPriceAdjustment={clearPriceAdjustment}
                      posContext={posContext}
                      defaultLocation={defaultLocation}
                      productSearchInputRef={productSearchInputRef}
                      productSectionRef={productSectionRef}
                      onActivate={() => setActiveStage("products")}
                    />

                    <CustomerStage
                      active={activeStage === "customer"}
                      documentType={documentType}
                      setDocumentType={setDocumentType}
                      documentPickerOpen={documentPickerOpen}
                      setDocumentPickerOpen={setDocumentPickerOpen}
                      customerQuery={customerQuery}
                      setCustomerQuery={setCustomerQuery}
                      customerResults={customerResults}
                      loadingCustomers={loadingCustomers}
                      customerPickerOpen={customerPickerOpen}
                      setCustomerPickerOpen={setCustomerPickerOpen}
                      highlightedCustomerIndex={highlightedCustomerIndex}
                      setHighlightedCustomerIndex={setHighlightedCustomerIndex}
                      selectedCustomer={selectedCustomer}
                      selectCustomer={selectCustomer}
                      genericCustomer={genericCustomer}
                      isGenericCustomerSelected={isGenericCustomerSelected}
                      customerStepReady={customerStepReady}
                      customerIsValid={customerIsValid}
                      canEditSelectedCustomer={canEditSelectedCustomer}
                      activeDocumentOption={activeDocumentOption}
                      selectedCustomerName={selectedCustomerName}
                      selectedCustomerDocument={selectedCustomerDocument}
                      openCustomerSheet={openCustomerSheet}
                      goToPayment={() => goToStage("payment")}
                      customerSearchInputRef={customerSearchInputRef}
                      customerSectionRef={customerSectionRef}
                      documentPickerRef={documentPickerRef}
                      onActivate={() => setActiveStage("customer")}
                    />

                    <PaymentStage
                      active={activeStage === "payment"}
                      activeDocumentOption={activeDocumentOption}
                      cartCount={cartCount}
                      totals={totals}
                      saleDiscount={saleDiscount}
                      saleDiscountError={saleDiscountError}
                      saleDiscountTargetTotal={saleDiscountTargetTotal}
                      setDiscountModalOpen={setDiscountModalOpen}
                      paymentMode={paymentMode}
                      setPaymentModeWithDefaults={setPaymentModeWithDefaults}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      mixedPayments={mixedPayments}
                      mixedPaymentsPreview={mixedPaymentsPreview}
                      updateMixedPaymentDraft={updateMixedPaymentDraft}
                      addMixedPaymentDraft={addMixedPaymentDraft}
                      removeMixedPaymentDraft={removeMixedPaymentDraft}
                      onActivate={() => setActiveStage("payment")}
                    />

                    <SummaryStage
                      active={activeStage === "summary"}
                      activeDocumentOption={activeDocumentOption}
                      selectedCustomerName={selectedCustomerName}
                      selectedCustomerDocument={selectedCustomerDocument}
                      selectedCustomer={selectedCustomer}
                      isGenericCustomerSelected={isGenericCustomerSelected}
                      customerStepReady={customerStepReady}
                      cartCount={cartCount}
                      totals={totals}
                      paymentMode={paymentMode}
                      paymentSummaryLabel={paymentSummaryLabel}
                      mixedPaymentsPreview={mixedPaymentsPreview}
                      mixedPayments={mixedPayments}
                      cashReady={cashReady}
                      cashStatus={cashStatus}
                      canOpenCashModule={canOpenCashModule}
                      posContext={posContext}
                      summaryStatusMessage={summaryStatusMessage}
                      submitDisabled={submitDisabled}
                      submitting={submitting}
                      error={error}
                      goToStage={goToStage}
                      confirmSale={confirmSale}
                      onActivate={() => setActiveStage("summary")}
                    />
                  </section>
                </div>
            </OpsPageShell>
          </TooltipProvider>

          <DialogPrimitive.Root open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
              <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5 shadow-xl outline-none data-open:animate-in data-open:zoom-in-95 data-closed:animate-out data-closed:zoom-out-95">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-strong)] pb-4">
                  <div>
                    <DialogPrimitive.Title className="text-lg font-semibold text-[var(--ops-text)]">
                      Ajustes comerciales
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      El descuento afecta el total del documento. Los precios base del producto se mantienen visibles por separado.
                    </DialogPrimitive.Description>
                  </div>
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                      aria-label="Cerrar ajustes comerciales"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogPrimitive.Close>
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="grid gap-3 lg:grid-cols-[180px_120px_minmax(0,1fr)]">
                    <div>
                      <label className={COMPACT_LABEL_CLASS}>Tipo</label>
                      <div className="inline-flex rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSaleDiscount((current) => ({
                              ...current,
                              mode: "percent",
                              value: current.mode === "none" ? "" : current.value,
                              reason: current.mode === "none" ? "" : current.reason,
                            }))
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                            saleDiscount.mode === "percent"
                              ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                              : "text-[var(--ops-text-muted)]"
                          }`}
                        >
                          % Porcentaje
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSaleDiscount((current) => ({
                              ...current,
                              mode: "fixed",
                              value: current.mode === "none" ? "" : current.value,
                              reason: current.mode === "none" ? "" : current.reason,
                            }))
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                            saleDiscount.mode === "fixed"
                              ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                              : "text-[var(--ops-text-muted)]"
                          }`}
                        >
                          S/. Monto fijo
                        </button>
                      </div>
                    </div>

                    {saleDiscount.mode !== "none" ? (
                      <div>
                        <label className={COMPACT_LABEL_CLASS}>
                          {saleDiscount.mode === "percent" ? "Porcentaje" : "Monto"}
                        </label>
                        <input
                          value={saleDiscount.value}
                          onChange={(event) =>
                            setSaleDiscount((current) => ({
                              ...current,
                              value: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder={saleDiscount.mode === "percent" ? "10" : "20.00"}
                          className={INPUT_CLASS}
                        />
                      </div>
                    ) : (
                      <div className="hidden lg:block" aria-hidden="true" />
                    )}

                    <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--ops-text-muted)]">Subtotal base</span>
                        <span className="font-semibold text-[var(--ops-text)]">
                          S/. {formatMoney(totals.baseSubtotal)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-[var(--ops-text-muted)]">Descuento</span>
                        <span className="font-semibold text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                          - S/. {formatMoney(totals.saleDiscountAmount)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--ops-border-strong)] pt-1">
                        <span className="font-semibold text-[var(--ops-text)]">Total documento</span>
                        <span className="font-semibold text-[var(--ops-text)]">
                          S/. {formatMoney(saleDiscountTargetTotal)}
                        </span>
                      </div>
                      {totals.taxRate > 0 ? (
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-[var(--ops-text-muted)]">
                            IGV incluido ({(totals.taxRate * 100).toFixed(0)}%)
                          </span>
                          <span className="font-semibold text-[var(--ops-text)]">
                            S/. {formatMoney(totals.tax)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {saleDiscount.mode !== "none" ? (
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <label className={COMPACT_LABEL_CLASS}>Motivo</label>
                        <OpsSelectMenu
                          value={discountReasonSelection}
                          onValueChange={(value) =>
                            setSaleDiscount((current) => ({
                              ...current,
                              reason: value === "custom" ? "" : value,
                            }))
                          }
                          placeholder="Seleccionar motivo"
                          options={SALE_DISCOUNT_REASON_OPTIONS}
                        />
                      </div>

                      {discountReasonSelection === "custom" ? (
                        <div>
                          <label className={COMPACT_LABEL_CLASS}>Detalle</label>
                          <input
                            value={saleDiscount.reason}
                            onChange={(event) =>
                              setSaleDiscount((current) => ({
                                ...current,
                                reason: event.target.value,
                              }))
                            }
                            placeholder="Motivo personalizado"
                            className={INPUT_CLASS}
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
                          El descuento quedará trazado en el comprobante y en el resumen final.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
                      Sin descuento general aplicado.
                    </div>
                  )}

                  {saleDiscountError ? (
                    <p className={`rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}>
                      {saleDiscountError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-[var(--ops-border-strong)] pt-4">
                  <DialogPrimitive.Close asChild>
                    <Button type="button" variant="outline" className="rounded-lg">
                      Cerrar
                    </Button>
                  </DialogPrimitive.Close>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <SheetContent
            side="right"
            className="w-full border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] sm:max-w-lg"
          >
            <SheetHeader className="border-b border-[var(--ops-border-strong)] px-5 py-4">
              <SheetTitle>
                {customerSheetMode === "edit"
                  ? "Editar cliente"
                  : "Crear cliente rapido"}
              </SheetTitle>
              <SheetDescription>
                {customerSheetMode === "edit"
                  ? "Ajusta el cliente seleccionado sin salir de la venta."
                  : "Crea un cliente operativo y dejalo seleccionado automaticamente en la venta."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--ops-text-muted)]">
                    Tipo de alta
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm(createEmptyCustomerForm("retail"))
                      }
                      disabled={customerSheetMode === "edit"}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition ${
                        customerForm.entry_mode === "retail"
                          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)] ring-1 ring-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)]"
                          : "border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      Cliente retail
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerForm(createEmptyCustomerForm("factura"))
                      }
                      disabled={customerSheetMode === "edit"}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition ${
                        customerForm.entry_mode === "factura"
                          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)] ring-1 ring-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)]"
                          : "border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      Cliente factura
                    </button>
                  </div>
                </div>

                {customerForm.entry_mode === "factura" ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        RUC
                      </label>
                      <input
                        value={customerForm.document_number}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            document_number: event.target.value,
                          }))
                        }
                        placeholder="20123456789"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Razon social
                      </label>
                      <input
                        value={customerForm.business_name}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            business_name: event.target.value,
                          }))
                        }
                        placeholder="Empresa Demo S.A.C."
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Direccion fiscal
                      </label>
                      <input
                        value={customerForm.address}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Av. Ejemplo 123, Lima"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Telefono
                        </label>
                        <input
                          value={customerForm.phone}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="999 000 000"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Correo
                        </label>
                        <input
                          value={customerForm.email}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="ventas@empresa.com"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Tipo de documento
                        </label>
                        <select
                          value={customerForm.document_type}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              document_type: event.target.value,
                              document_number:
                                event.target.value === "none"
                                  ? ""
                                  : current.document_number,
                            }))
                          }
                          className={INPUT_CLASS}
                        >
                          <option value="dni">DNI</option>
                          <option value="ce">CE</option>
                          <option value="passport">Pasaporte</option>
                          <option value="none">Sin documento</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Numero de documento
                        </label>
                        <input
                          value={customerForm.document_number}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              document_number: event.target.value,
                            }))
                          }
                          placeholder="Ingresa el numero"
                          className={`${INPUT_CLASS} ${
                            customerForm.document_type === "none"
                              ? "bg-[var(--ops-surface-muted)]"
                              : ""
                          }`}
                          disabled={customerForm.document_type === "none"}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Nombre completo
                      </label>
                      <input
                        value={customerForm.full_name}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                        placeholder="Nombre del cliente"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Telefono
                        </label>
                        <input
                          value={customerForm.phone}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="999 000 000"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                          Correo
                        </label>
                        <input
                          value={customerForm.email}
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="cliente@correo.com"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </>
                )}

                {customerFormError ? (
                  <div className="rounded-xl border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2 text-sm text-[var(--ops-tone-danger-text)]">
                    {customerFormError}
                  </div>
                ) : null}
              </div>
            </div>

            <SheetFooter className="border-t border-[var(--ops-border-strong)] px-5 py-4">
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={closeCustomerSheet}
                  disabled={customerSaving}
                  className="flex-1 rounded-lg border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitCustomerForm}
                  disabled={customerSaving}
                  className="flex-1 cursor-pointer rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {customerSaving
                    ? "Guardando..."
                    : customerSheetMode === "edit"
                      ? "Guardar cliente"
                      : "Crear y seleccionar"}
                </button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet
          open={priceSheetOpen}
          onOpenChange={(open) => {
            if (!open) {
              closePriceSheet();
            } else {
              setPriceSheetOpen(true);
            }
          }}
        >
          <SheetContent
            side="right"
            className="w-full border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] sm:max-w-md"
          >
            <SheetHeader className="border-b border-[var(--ops-border-strong)] px-5 py-4">
              <SheetTitle>Ajustar precio del item</SheetTitle>
              <SheetDescription>
                Define un precio manual y deja el motivo trazado en la venta.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {priceTargetItem ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {priceTargetItem.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {priceTargetItem.sku}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
                          {priceTargetPreviewItem?.price_type_applied ===
                          "wholesale"
                            ? "Mayorista"
                            : "Retail"}
                        </p>
                        <p className="font-semibold text-[var(--ops-text)]">
                          S/.{" "}
                          {formatMoney(
                            priceTargetPreviewItem?.unit_price_list ??
                              priceTargetItem.wholesale_price ??
                              priceTargetItem.retail_price,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Cantidad
                        </p>
                        <p className="font-semibold text-[var(--ops-text)]">
                          {priceTargetItem.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Regla aplicada
                        </p>
                        <p className="font-semibold text-[var(--ops-text)]">
                          {priceTargetPreviewItem?.price_type_applied ===
                          "wholesale"
                            ? "Mayorista 3+"
                            : "Retail"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      Precio final por unidad
                    </label>
                    <input
                      value={priceForm.unit_price_final}
                      onChange={(event) =>
                        setPriceForm((current) => ({
                          ...current,
                          unit_price_final: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      Motivo del ajuste
                    </label>
                    <input
                      value={priceForm.reason}
                      onChange={(event) =>
                        setPriceForm((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Cliente frecuente, cierre comercial, observacion..."
                      className={INPUT_CLASS}
                    />
                  </div>

                  {priceFormError ? (
                    <div className="rounded-xl border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2 text-sm text-[var(--ops-tone-danger-text)]">
                      {priceFormError}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                  Selecciona un item para ajustar su precio.
                </div>
              )}
            </div>

            <SheetFooter className="border-t border-[var(--ops-border-strong)] px-5 py-4">
              <div className="flex w-full gap-3">
                {priceTargetItem?.price_override ? (
                  <button
                    type="button"
                    onClick={() =>
                      clearPriceAdjustment(priceTargetItem.variant_id)
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--ops-surface-muted)] ${buildSemanticChipClass("warning")}`}
                  >
                    Quitar ajuste
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closePriceSheet}
                  className="flex-1 rounded-lg border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitPriceAdjustment}
                  className="flex-1 cursor-pointer rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
                >
                  Guardar ajuste
                </button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
