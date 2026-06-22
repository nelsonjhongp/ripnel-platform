"use client"

import { useMemo } from "react"
import { PencilLine, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { OpsHint } from "@/components/ui/ops-hint"

import { StageSection } from "./stage-section"
import { renderDocumentIcon } from "./pos-icons"
import type { CustomerStageProps } from "./pos-stage-props"
import { DOC_TYPES } from "./pos-types"
import { INFO_BOX } from "./pos-constants"
import { POS } from "./pos-messages"
import {
  buildCustomerDisplayName,
  buildCustomerDocument,
} from "./pos-utils"

export function CustomerStage(props: CustomerStageProps) {
  const {
    pulseStage,
    documentType,
    setDocumentType,
    customerQuery,
    setCustomerQuery,
    customerResults,
    loadingCustomers,
    customerPickerOpen,
    setCustomerPickerOpen,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    selectedCustomer,
    selectCustomer,
    canEditSelectedCustomer,
    activeDocumentOption,
    openCustomerDialog,
    customerSearchInputRef,
    customerSectionRef,
    selectedCustomerName,
    selectedCustomerDocument,
  } = props

  const customerInputValue = useMemo(() => {
    if (customerPickerOpen || customerQuery) return customerQuery
    if (selectedCustomer) return selectedCustomerName
    return ""
  }, [customerPickerOpen, customerQuery, selectedCustomer, selectedCustomerName])

  const customerInputPlaceholder = useMemo(() => {
    if (selectedCustomer && !customerPickerOpen && !customerQuery) {
      return selectedCustomerName
    }
    return POS.customer.searchPlaceholder
  }, [selectedCustomer, customerPickerOpen, customerQuery, selectedCustomerName])

  const documentOptions = useMemo<OpsOption[]>(
    () =>
      DOC_TYPES.map((docType) => ({
        value: docType.value,
        label: docType.label,
        leading: renderDocumentIcon(
          docType.value,
          "h-4 w-4 shrink-0 text-[var(--ripnel-accent)]",
        ),
      })),
    [],
  )


  return (
    <StageSection
      sectionRef={customerSectionRef}
      stage="customer"
      pulseStage={pulseStage}
      pickerOpen={customerPickerOpen}
    >
      <OpsStepSectionHeading
        step={2}
        title={POS.stage.customer}
        meta={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openCustomerDialog("create")}
            className="rounded-lg px-4"
          >
            <UserPlus className="h-4 w-4" />
            {POS.customer.createButton}
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(248px,296px)]">
          <SearchablePicker
              value={customerInputValue}
              onChange={(value) => {
                setCustomerQuery(value)
                if (selectedCustomer) {
                  selectCustomer(null)
                }
              }}
              placeholder={customerInputPlaceholder}
              openOnFocus
              open={customerPickerOpen}
              onOpenChange={setCustomerPickerOpen}
              items={customerResults}
              loading={loadingCustomers}
              loadingMessage="Buscando clientes…"
              emptyMessage={
                customerResults.length === 0 && customerQuery.trim()
                  ? POS.customer.noMatchMessage
                  : ""
              }
              maxVisibleItems={6}
              highlightedIndex={highlightedCustomerIndex}
              onHighlightChange={setHighlightedCustomerIndex}
              getItemKey={(customer) => customer.customer_id}
              renderItem={(customer) => (
                <div className="flex w-full min-w-0 items-center gap-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--ops-text)]">
                      {buildCustomerDisplayName(customer)}
                    </p>
                    <p className="text-[11px] text-[var(--ops-text-muted)]">
                      {buildCustomerDocument(customer)}
                    </p>
                  </div>
                </div>
              )}
              onSelect={(customer) => {
                selectCustomer(customer)
              }}
              onClear={() => {
                setCustomerQuery("")
                selectCustomer(null)
                window.requestAnimationFrame(() => {
                  customerSearchInputRef.current?.focus()
                })
              }}
              inputRef={customerSearchInputRef}
              name="sale_customer_search"
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
              showClear={Boolean(selectedCustomer || customerQuery)}
              density="compact"
              className={pulseStage === "customer" ? "animate-focus-flash" : ""}
            />
          <div>
            <OpsSelect
              value={documentType}
              onValueChange={(value) => {
                setDocumentType(value)
              }}
              placeholder="Seleccionar"
              options={documentOptions}
              className={`h-9 ${selectedCustomer && (!documentType || documentType === "none") ? "animate-hint-pulse" : ""} ${pulseStage === "customer" ? "animate-focus-flash" : ""}`}
              triggerContent={(option) => (
                <span className="flex min-w-0 items-center gap-2">
                  {option?.leading ??
                    renderDocumentIcon(
                      activeDocumentOption?.value ?? "",
                      "h-4 w-4 shrink-0 text-[var(--ripnel-accent)]",
                    )}
                  <span className="truncate">
                    {option?.label ?? activeDocumentOption?.label ?? "Seleccionar"}
                  </span>
                </span>
              )}
            />
          </div>
        </div>

        {!selectedCustomer ? (
          <OpsHint>{POS.customer.assignHint}</OpsHint>
        ) : (
          <div className={INFO_BOX}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                  {selectedCustomerName}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--ops-text-muted)]">
                  {activeDocumentOption?.label ?? "Comprobante pendiente"} · {selectedCustomerDocument}
                </p>
              </div>

              {canEditSelectedCustomer ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => openCustomerDialog("edit")}
                  className="rounded-lg text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                  aria-label={POS.customer.editAria}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </StageSection>
  )
}
