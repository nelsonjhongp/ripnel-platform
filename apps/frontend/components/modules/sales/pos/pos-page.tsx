"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  ShieldAlert,
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
import { OpsActionBanner } from "@/components/ui/ops-action-banner";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { SaleReviewDialog } from "@/components/ui/purchase-system/sale-review-dialog";
import { SaleConfirmationDialog } from "@/components/ui/purchase-system/sale-confirmation-dialog";
import { RemoveItemDialog } from "./pos-dialogs/remove-item-dialog";
import { PriceAdjustmentDialog } from "./pos-dialogs/price-adjustment-dialog";
import { DiscountDialog } from "./pos-dialogs/discount-dialog";
import { ProductConfigDialog } from "./pos-dialogs/product-config-dialog";
import { CustomerDialog } from "./pos-dialogs/customer-dialog";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { INPUT_CLASS } from "./pos-constants";
import { buildCashLabel, getPaymentMethodLabel } from "./pos-utils";
import { usePosSale } from "./use-pos-sale";

export default function NuevaVentaPage() {
  const {
    defaultLocation,
    locationsLoading,
    has,
    customerSectionRef,
    productSectionRef,
    paymentSectionRef,
    productSearchInputRef,
    customerSearchInputRef,
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    pricingModeOverride,
    setPricingModeOverride,
    cart,
    documentType,
    setDocumentType,
    paymentMethod,
    setPaymentMethod,
    paymentMode,
    singleReference,
    setSingleReference,
    mixedPayments,
    saleDiscount,
    discountModalOpen,
    setDiscountModalOpen,
    customerQuery,
    setCustomerQuery,
    customerResults,
    loadingCustomers,
    customerPickerOpen,
    setCustomerPickerOpen,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    selectedCustomer,
    posContext,
    posContextLoading,
    posContextError,
    customerDialogOpen,
    setCustomerDialogOpen,
    customerDialogMode,
    priceSheetOpen,
    productConfigOpen,
    setProductConfigOpen,
    pulseStage,
    priceTargetItem,
    priceTargetPreviewItem,
    pendingRemoveItem,
    pendingRemoveVariantId,
    cashOpenDialogOpen,
    setCashOpenDialogOpen,
    openingCash,
    reopenCashDialogOpen,
    setReopenCashDialogOpen,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    submitting,
    confirmedSale,
    saleConfirmationOpen,
    setSaleConfirmationOpen,
    saleReviewOpen,
    setSaleReviewOpen,
    error,
    searchableStyles,
    effectivePreviewPriceMode,
    previewWholesaleApplies,
    totals,
    mixedPaymentsPreview,
    customerIsValid,
    cashReady,
    cashStatus,
    canOpenCashModule,
    canReopenCash,
    summaryStatusMessage,
    submitDisabled,
    hasDraftSale,
    cartCount,
    customerStepReady,
    canEditSelectedCustomer,
    activeDocumentOption,
    paymentSummaryLabel,
    selectedCustomerName,
    selectedCustomerDocument,
    printConfirmedSaleReceipt,
    startNextSale,
    resetSaleDraft,
    openSaleReview,
    closeSaleReview,
    goToStage,
    setPaymentModeWithDefaults,
    updateMixedPaymentDraft,
    addMixedPaymentDraft,
    removeMixedPaymentDraft,
    openPriceSheet,
    closePriceSheet,
    submitPriceAdjustment,
    clearPriceAdjustment,
    closeRemoveItemConfirm,
    confirmRemoveFromCart,
    closeProductConfigModal,
    addSelectedVariantToCart,
    addToCart,
    updateQty,
    removeFromCart,
    selectProductStyle,
    selectCustomer,
    openDiscountModal,
    closeDiscountModal,
    applyDiscountDraft,
    openCustomerDialog,
    closeCustomerDialog,
    handleCustomerSaved,
    confirmSale,
    handleOpenCash,
    handleReopenCash,
  } = usePosSale();
  const [clearSaleDialogOpen, setClearSaleDialogOpen] = useState(false)
  const documentReviewLabel =
    activeDocumentOption?.label || "Comprobante pendiente"
  const documentReviewDetail =
    selectedCustomerDocument || "Sin documento"
  const paymentReviewModeLabel =
    paymentMode === "mixed" ? "Pago mixto" : "Pago único"
  const paymentReviewItems =
    paymentMode === "mixed"
      ? mixedPaymentsPreview?.payments.map((payment, index) => ({
          id: `payment-${index}`,
          label: getPaymentMethodLabel(payment.method),
          amount: Number(payment.amount || 0),
          reference: payment.reference || null,
        })) || []
      : [
          {
            id: "payment-single",
            label: paymentSummaryLabel,
            amount: totals.total,
            reference: singleReference.trim() || null,
          },
        ]
  const productReviewItems = totals.items.map((item) => ({
    id: item.variant_id,
    title: item.style_name,
    detail: `${item.size_name || item.size_code} / ${item.color_name || item.color_code}`,
    quantity: item.quantity,
    subtotal: item.line_total,
  }))

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
                      <OpsStatusBadge
                        tone="neutral"
                        size="sm"
                        icon={<MapPin className="text-[var(--ripnel-accent)]" />}
                      >
                        {locationsLoading
                          ? "Cargando sede…"
                          : defaultLocation?.name || "Sin sede asignada"}
                      </OpsStatusBadge>
                      <OpsStatusBadge
                        tone={
                          posContextLoading
                            ? "neutral"
                            : cashReady
                              ? "success"
                              : cashStatus === "closed"
                                ? "danger"
                                : "warning"
                        }
                        size="sm"
                        icon={
                          posContextLoading ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : undefined
                        }
                      >
                        {posContextLoading
                          ? "Validando caja"
                          : cashReady
                            ? "Caja abierta"
                            : buildCashLabel(cashStatus)}
                      </OpsStatusBadge>
                    </>
                  }
                  actions={
                    hasDraftSale ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setClearSaleDialogOpen(true)}
                        className="rounded-lg"
                      >
                        Limpiar venta
                      </Button>
                    ) : null
                  }
                />

                {!defaultLocation?.location_id && !locationsLoading ? (
                  <InlineStatusCard
                    title="No hay sede operativa activa"
                    description="Debes tener una sede default asignada para registrar ventas. Configurala desde tu cuenta o solicita apoyo al administrador."
                    tone="warning"
                    variant="ops"
                    icon={<MapPin className="h-5 w-5" />}
                  />
                ) : null}

                {confirmedSale && !saleConfirmationOpen ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-surface-muted)] text-[var(--ripnel-accent)]">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          Venta confirmada: {confirmedSale.sale_number}
                        </p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          La venta ya está cerrada. Puedes reabrir el resumen o iniciar otra venta.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSaleConfirmationOpen(true)}
                        className="rounded-lg"
                      >
                        Reabrir resumen
                      </Button>
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        onClick={startNextSale}
                        className="rounded-lg"
                      >
                        Nueva venta
                      </Button>
                    </div>
                  </div>
                ) : null}

                {posContextError ? (
                  <InlineStatusCard
                    title="No pudimos validar el contexto de venta"
                    description={posContextError}
                    tone="warning"
                    variant="ops"
                    icon={<ShieldAlert className="h-5 w-5" />}
                  />
                ) : null}
                {!cashReady && posContext && !posContextLoading ? (
                  cashStatus === "missing" ? (
                    canOpenCashModule ? (
                      <OpsActionBanner
                        icon={CircleAlert}
                        tone="warning"
                        title="Aún no se abrió caja"
                        description={posContext.cash?.message || "Abre caja para habilitar ventas en esta sede."}
                        actionLabel="Abrir caja"
                        actionTone="accent"
                        onAction={() => setCashOpenDialogOpen(true)}
                        loading={openingCash}
                      />
                    ) : (
                      <OpsActionBanner
                        icon={CircleAlert}
                        tone="warning"
                        title="Aún no se abrió caja"
                        description="Coordina con caja o con un administrador para habilitar la venta."
                      />
                    )
                  ) : (
                    <OpsActionBanner
                      icon={Clock3}
                      tone="danger"
                      title="Caja cerrada"
                      description={posContext.cash?.message || "La caja operativa de hoy ya fue cerrada para esta sede."}
                      {...(canReopenCash
                        ? {
                            actionLabel: "Reabrir caja",
                            actionTone: "accent" as const,
                            onAction: () => {
                              setReopenNotes("")
                              setReopenCashDialogOpen(true)
                            },
                          }
                        : {})}
                    />
                  )
                ) : null}

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.72fr)_minmax(360px,400px)]">
                    <div className="space-y-4">
                      <ProductStage
                        active={true}
                        pulseStage={pulseStage}
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
                        previewWholesaleApplies={previewWholesaleApplies}
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
                        pricingModeOverride={pricingModeOverride}
                        setPricingModeOverride={setPricingModeOverride}
                        onActivate={() => {}}
                      />

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

                      <PaymentStage
                        active={true}
                        pulseStage={pulseStage}
                        cartCount={cartCount}
                        totals={totals}
                        openDiscountModal={openDiscountModal}
                        paymentMode={paymentMode}
                        setPaymentModeWithDefaults={setPaymentModeWithDefaults}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        singleReference={singleReference}
                        setSingleReference={setSingleReference}
                        mixedPayments={mixedPayments}
                        mixedPaymentsPreview={mixedPaymentsPreview}
                        updateMixedPaymentDraft={updateMixedPaymentDraft}
                        addMixedPaymentDraft={addMixedPaymentDraft}
                        removeMixedPaymentDraft={removeMixedPaymentDraft}
                        onActivate={() => {}}
                        paymentSectionRef={paymentSectionRef}
                      />
                    </div>

                    <SummaryStage
                      activeDocumentOption={activeDocumentOption}
                      selectedCustomerName={selectedCustomerName}
                      selectedCustomerDocument={selectedCustomerDocument}
                      documentType={documentType}
                      customerStepReady={customerStepReady}
                      cartCount={cartCount}
                      totals={totals}
                      paymentMode={paymentMode}
                      paymentMethod={paymentMethod}
                      paymentSummaryLabel={paymentSummaryLabel}
                      mixedPaymentsPreview={mixedPaymentsPreview}
                      mixedPayments={mixedPayments}
                      cashReady={cashReady}
                      cashStatus={cashStatus}
                      summaryStatusMessage={summaryStatusMessage}
                      submitDisabled={submitDisabled}
                      submitting={submitting}
                      error={error}
                      goToStage={goToStage}
                      onReviewSale={openSaleReview}
                    />
                  </section>
                </div>
            </OpsPageShell>
          </TooltipProvider>

          <ProductConfigDialog
            open={productConfigOpen}
            onOpenChange={setProductConfigOpen}
            style={selectedProductStyle}
            effectivePriceMode={effectivePreviewPriceMode}
            onClose={closeProductConfigModal}
            onConfirm={addSelectedVariantToCart}
          />

          <DiscountDialog
            open={discountModalOpen}
            onOpenChange={setDiscountModalOpen}
            totals={totals}
            currentDiscount={saleDiscount}
            onApply={applyDiscountDraft}
            onClose={closeDiscountModal}
          />

          <CustomerDialog
            open={customerDialogOpen}
            onOpenChange={setCustomerDialogOpen}
            mode={customerDialogMode as "create" | "edit"}
            selectedCustomer={selectedCustomer}
            documentType={documentType}
            onSaved={handleCustomerSaved}
            onClose={closeCustomerDialog}
          />

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
          onOpenChange={() => {}}
          item={priceTargetItem}
          previewItem={priceTargetPreviewItem}
          onClose={closePriceSheet}
          onConfirm={(variantId, unitPriceFinal, reason) => submitPriceAdjustment(variantId, unitPriceFinal, reason)}
          onClear={() => {
            if (priceTargetItem) clearPriceAdjustment(priceTargetItem.variant_id)
          }}
        />

        <RemoveItemDialog
          open={Boolean(pendingRemoveVariantId && pendingRemoveItem)}
          onOpenChange={() => {}}
          item={pendingRemoveItem}
          onClose={closeRemoveItemConfirm}
          onConfirm={confirmRemoveFromCart}
        />

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
          }
        >
          <p className="text-sm text-[var(--ops-text-muted)]">
            Úsalo cuando quieras reiniciar la venta sin cerrar el flujo actual.
          </p>
        </OpsDialog>

        <OpsDialog
          open={cashOpenDialogOpen}
          onOpenChange={setCashOpenDialogOpen}
          title="Abrir caja"
          description={defaultLocation?.name ? `Iniciar sesión de caja en ${defaultLocation.name}` : undefined}
          size="sm"
          bodyClassName="space-y-4"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={() => setCashOpenDialogOpen(false)} disabled={openingCash}>
                Cancelar
              </Button>
              <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={handleOpenCash} disabled={openingCash}>
                {openingCash ? "Abriendo..." : "Abrir caja"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--ops-text-muted)]">Sede</span>
                <span className="text-sm font-medium text-[var(--ops-text)]">{defaultLocation?.name || "—"}</span>
              </div>
              {posContext?.business_date ? (
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--ops-text-muted)]">Fecha operativa</span>
                  <span className="text-sm font-medium text-[var(--ops-text)]">{posContext.business_date}</span>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-[var(--ops-text-muted)]">
              Al abrir caja se habilita el registro de ventas en esta sede para la fecha actual. Podes cerrarla cuando termines la jornada.
            </p>
          </div>
        </OpsDialog>

        <OpsDialog
          open={reopenCashDialogOpen}
          onOpenChange={setReopenCashDialogOpen}
          title="Reabrir caja"
          description={defaultLocation?.name ? `Reabrir la sesión de caja cerrada en ${defaultLocation.name}` : undefined}
          size="sm"
          bodyClassName="space-y-4"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={() => setReopenCashDialogOpen(false)} disabled={reopeningCash}>
                Cancelar
              </Button>
              <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={handleReopenCash} disabled={reopeningCash || !reopenNotes.trim()}>
                {reopeningCash ? "Reabriendo..." : "Reabrir caja"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--ops-text-muted)]">Sede</span>
                <span className="text-sm font-medium text-[var(--ops-text)]">{defaultLocation?.name || "—"}</span>
              </div>
              {posContext?.business_date ? (
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--ops-text-muted)]">Fecha operativa</span>
                  <span className="text-sm font-medium text-[var(--ops-text)]">{posContext.business_date}</span>
                </div>
              ) : null}
            </div>
            <OpsFormField label="Motivo de reapertura" required density="compact">
              <input
                value={reopenNotes}
                onChange={(event) => setReopenNotes(event.target.value)}
                placeholder="Ej. Error en cierre, venta pendiente de registrar..."
                className={INPUT_CLASS}
              />
            </OpsFormField>
            <p className="text-sm text-[var(--ops-text-muted)]">
              Al reabrir la caja se volverá a habilitar el registro de ventas en esta sede para la fecha actual. Esta acción quedará registrada en el historial de caja.
            </p>
          </div>
        </OpsDialog>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
