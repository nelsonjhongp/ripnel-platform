"use client";

import { useState } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  ShieldAlert,
} from "lucide-react";

import { ProductStage } from "./stage-products";
import { CustomerStage } from "./stage-customer";
import { PaymentStage } from "./stage-payment";
import { SummaryStage } from "./stage-summary";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { OpsActionBanner } from "@/components/ui/ops-action-banner";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { SaleReviewDialog } from "@/components/ui/purchase-system/sale-review-dialog";
import { SaleConfirmationDialog } from "@/components/ui/purchase-system/sale-confirmation-dialog";
import { CashOpenDialog } from "./pos-dialogs/cash-open-dialog";
import { CashReopenDialog } from "./pos-dialogs/cash-reopen-dialog";
import { ClearSaleDialog } from "./pos-dialogs/clear-sale-dialog";
import { RemoveItemDialog } from "./pos-dialogs/remove-item-dialog";
import { PriceAdjustmentDialog } from "./pos-dialogs/price-adjustment-dialog";
import { DiscountDialog } from "./pos-dialogs/discount-dialog";
import { ProductConfigDialog } from "./pos-dialogs/product-config-dialog";
import { CustomerDialog } from "./pos-dialogs/customer-dialog";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { POS } from "./pos-messages";
import { buildCashLabel, getPaymentMethodLabel } from "./pos-utils";
import { usePosSale } from "./use-pos-sale";

export default function NuevaVentaPage() {
  const {
    defaultLocation,
    locationsLoading,
    has,
    refs: {
      customerSectionRef,
      productSectionRef,
      paymentSectionRef,
      productSearchInputRef,
      customerSearchInputRef,
    },
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
    activeDocumentOption?.label || POS.summary.pendingDocument
  const documentReviewDetail =
    selectedCustomerDocument || POS.customer.noDocument
  const paymentReviewModeLabel =
    paymentMode === "mixed" ? POS.payment.mixed : POS.payment.single
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
        <TooltipProvider delayDuration={120}>
            <OpsPageShell width="wide" className="max-w-[1380px] space-y-4">
                <PosHeader
                  eyebrow={POS.header.eyebrow}
                  title={POS.header.title}
                  meta={
                    <>
                      <OpsStatusBadge
                        tone="neutral"
                        size="sm"
                        icon={<MapPin className="text-[var(--ripnel-accent)]" />}
                      >
                        {locationsLoading
                          ? POS.cash.loadingLocation
                          : defaultLocation?.name || POS.cash.noLocation}
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
                          ? POS.cash.validating
                          : cashReady
                            ? POS.cash.open
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
                        {POS.summary.clearButton}
                      </Button>
                    ) : null
                  }
                />

                {!defaultLocation?.location_id && !locationsLoading ? (
                  <InlineStatusCard
                    title={POS.cash.noLocationActive}
                    description={POS.cash.noLocationDesc}
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
                          {POS.summary.confirmedPrefix}: {confirmedSale.sale_number}
                        </p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          {POS.summary.confirmedBanner}
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
                        {POS.summary.reopenButton}
                      </Button>
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        onClick={startNextSale}
                        className="rounded-lg"
                      >
                        {POS.summary.newSaleButton}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {posContextError ? (
                  <InlineStatusCard
                    title={POS.error.contextTitle}
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
                        title={POS.cash.missing}
                        description={posContext.cash?.message || POS.cash.missingOpenDesc}
                        actionLabel={POS.cash.openTitle}
                        actionTone="accent"
                        onAction={() => setCashOpenDialogOpen(true)}
                        loading={openingCash}
                      />
                    ) : (
                      <OpsActionBanner
                        icon={CircleAlert}
                        tone="warning"
                        title={POS.cash.missing}
                        description={POS.cash.missingNoPermissionDesc}
                      />
                    )
                  ) : (
                    <OpsActionBanner
                      icon={Clock3}
                      tone="danger"
                      title={POS.cash.closed}
                      description={posContext.cash?.message || POS.cash.closedDesc}
                      {...(canReopenCash
                        ? {
                            actionLabel: POS.cash.reopenTitle,
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
                      />

                      <CustomerStage
                        pulseStage={pulseStage}
                        documentType={documentType}
                        setDocumentType={setDocumentType}
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
                        customerStepReady={customerStepReady}
                        customerIsValid={customerIsValid}
                        canEditSelectedCustomer={canEditSelectedCustomer}
                        activeDocumentOption={activeDocumentOption}
                        selectedCustomerName={selectedCustomerName}
                        selectedCustomerDocument={selectedCustomerDocument}
                        openCustomerDialog={openCustomerDialog}
                        customerSearchInputRef={customerSearchInputRef}
                        customerSectionRef={customerSectionRef}
                      />

                      <PaymentStage
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
                      submitDisabled={submitDisabled}
                      submitting={submitting}
                      error={error}
                      goToStage={goToStage}
                      onReviewSale={openSaleReview}
                    />
                  </section>
            </OpsPageShell>
            <SaleReviewDialog
              open={saleReviewOpen}
              onOpenChange={setSaleReviewOpen}
              onClose={closeSaleReview}
              onConfirm={confirmSale}
              confirming={submitting}
              customerLabel={selectedCustomerName || POS.summary.pendingCustomer}
              customerDetail={selectedCustomerDocument || POS.customer.noDocument}
              documentLabel={documentReviewLabel}
              documentDetail={documentReviewDetail}
              paymentModeLabel={paymentReviewModeLabel}
              paymentAssignedAmount={paymentMode === "mixed"
                ? mixedPaymentsPreview?.enteredTotal ?? totals.total
                : totals.total}
              payments={paymentReviewItems}
              discountAmount={totals.saleDiscountAmount}
              totalAmount={totals.total}
              baseSubtotal={totals.baseSubtotal}
              items={productReviewItems}
            />
            <SaleConfirmationDialog
              open={saleConfirmationOpen}
              onOpenChange={setSaleConfirmationOpen}
              sale={confirmedSale}
              canOpenPostsale={has("sales.postsale.view")}
              onNewSale={startNextSale}
              onPrint={() => {
                if (confirmedSale?.sale_id) {
                  printConfirmedSaleReceipt(confirmedSale.sale_id)
                }
              }}
            />
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

        <PriceAdjustmentDialog
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

        <ClearSaleDialog
          open={clearSaleDialogOpen}
          onOpenChange={setClearSaleDialogOpen}
          onConfirm={() => {
            resetSaleDraft()
            setClearSaleDialogOpen(false)
            productSearchInputRef.current?.focus()
          }}
        />

        <CashOpenDialog
          open={cashOpenDialogOpen}
          onOpenChange={setCashOpenDialogOpen}
          location={defaultLocation}
          posContext={posContext}
          opening={openingCash}
          onConfirm={handleOpenCash}
        />

        <CashReopenDialog
          open={reopenCashDialogOpen}
          onOpenChange={setReopenCashDialogOpen}
          location={defaultLocation}
          posContext={posContext}
          notes={reopenNotes}
          setNotes={setReopenNotes}
          reopening={reopeningCash}
          onConfirm={handleReopenCash}
        />
      </PermissionGuard>
    </ErrorBoundary>
  );
}
