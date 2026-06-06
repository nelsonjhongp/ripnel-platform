"use client"

import { useMemo } from "react"
import { ChevronDown, PencilLine, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactPickerPopover, CompactPickerList, CompactPickerOption } from "@/components/ui/compact-picker"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { buildSemanticChipClass, buildCustomerDisplayName, buildCustomerDocument } from "./pos-utils"
import { renderDocumentIcon } from "./pos-icons"
import { DOC_TYPES } from "./pos-types"
import type { CustomerStageProps } from "./pos-stage-props"

export function CustomerStage(props: CustomerStageProps) {
  const {
    active,
    documentType, setDocumentType,
    documentPickerOpen, setDocumentPickerOpen,
    customerQuery, setCustomerQuery,
    customerResults, loadingCustomers,
    customerPickerOpen, setCustomerPickerOpen,
    highlightedCustomerIndex, setHighlightedCustomerIndex,
    selectedCustomer, selectCustomer,
    genericCustomer, isGenericCustomerSelected,
    customerStepReady, customerIsValid,
    canEditSelectedCustomer,
    activeDocumentOption,
    openCustomerSheet,
    goToPayment,
    customerSearchInputRef, customerSectionRef, documentPickerRef,
    onActivate,
  } = props

  const customerInputValue = useMemo(() => {
    if (customerPickerOpen || customerQuery) return customerQuery
    if (selectedCustomer) return buildCustomerDisplayName(selectedCustomer)
    return ""
  }, [customerPickerOpen, customerQuery, selectedCustomer])

  const customerInputPlaceholder = useMemo(() => {
    if (selectedCustomer && !customerPickerOpen && !customerQuery)
      return buildCustomerDisplayName(selectedCustomer)
    return "Nombre, documento o codigo"
  }, [selectedCustomer, customerPickerOpen, customerQuery])

  return (
    <div className="contents">
      <section
        ref={customerSectionRef}
        onMouseEnter={() => onActivate()}
        className={`relative space-y-3 xl:order-1 xl:col-span-2 ${
          active
            ? customerPickerOpen || documentPickerOpen
              ? "z-30"
              : "z-0"
            : "hidden"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[var(--ripnel-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
              Cliente
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {genericCustomer && !isGenericCustomerSelected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectCustomer(genericCustomer)}
                className="rounded-lg px-3"
              >
                Usar mostrador
              </Button>
            ) : null}
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => openCustomerSheet("create")}
              className="rounded-lg px-4"
            >
              <UserPlus className="h-4 w-4" />
              Crear cliente
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div ref={documentPickerRef} className="relative">
              <button
                type="button"
                onClick={() =>
                  setDocumentPickerOpen(!documentPickerOpen)
                }
                className="sales-field sales-field-interactive flex h-full w-full items-center justify-between rounded-xl px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {renderDocumentIcon(
                    activeDocumentOption?.value ?? "none",
                    "h-4 w-4 shrink-0 text-[var(--ripnel-accent)]",
                  )}
                  <span className="truncate">
                    {activeDocumentOption?.label ?? "Documento"}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
              </button>

              {documentPickerOpen ? (
                <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30">
                  <CompactPickerList>
                    {DOC_TYPES.map((docType) => {
                      const selected =
                        documentType === docType.value;
                      return (
                        <CompactPickerOption
                          key={docType.value}
                          selected={selected}
                          onClick={() => {
                            setDocumentType(docType.value);
                            setDocumentPickerOpen(false);
                            onActivate();
                          }}
                          className="flex items-center gap-2 text-sm"
                        >
                          {renderDocumentIcon(
                            docType.value,
                            "h-4 w-4 shrink-0",
                          )}
                          <span>{docType.label}</span>
                        </CompactPickerOption>
                      );
                    })}
                  </CompactPickerList>
                </CompactPickerPopover>
              ) : null}
            </div>

            <SearchablePicker
              value={customerInputValue}
              onChange={(value) => {
                setCustomerQuery(value);
                if (selectedCustomer) {
                  selectCustomer(null);
                }
              }}
              placeholder={customerInputPlaceholder}
              open={customerPickerOpen}
              onOpenChange={setCustomerPickerOpen}
              items={customerResults}
              loading={loadingCustomers}
              loadingMessage="Buscando clientes..."
              emptyMessage={
                customerResults.length === 0 &&
                customerQuery.trim()
                  ? "No encontramos coincidencias. Puedes crear el cliente y seguir con la venta."
                  : ""
              }
              maxVisibleItems={8}
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
                selectCustomer(customer);
              }}
              onClear={() => {
                setCustomerQuery("");
                selectCustomer(null);
                window.requestAnimationFrame(() => {
                  customerSearchInputRef.current?.focus();
                });
              }}
              inputRef={customerSearchInputRef}
              showClear={Boolean(selectedCustomer || customerQuery)}
            />
          </div>

          {!selectedCustomer ? (
            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-6 text-sm text-[var(--ops-text-muted)]">
              Selecciona un cliente desde el buscador o usa
              Cliente mostrador para continuar.
            </div>
          ) : (
            <div className="border-y border-[var(--ops-border-strong)] py-3">
              <div className="flex flex-wrap items-start gap-3 xl:grid xl:grid-cols-[minmax(0,1.15fr)_max-content_minmax(0,1fr)_max-content_max-content] xl:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                    {buildCustomerDisplayName(selectedCustomer)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--ops-text-muted)]">
                    {buildCustomerDocument(selectedCustomer)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--ops-text-muted)]">
                    {selectedCustomer.address ||
                      (isGenericCustomerSelected
                        ? "Cliente mostrador"
                        : "Sin direccion registrada")}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    customerStepReady
                      ? buildSemanticChipClass("success")
                      : buildSemanticChipClass("warning")
                  }`}
                >
                  {customerStepReady
                    ? isGenericCustomerSelected
                      ? "Mostrador confirmado"
                      : "Listo para el comprobante"
                    : customerIsValid
                      ? "Cliente elegido"
                      : documentType === "factura"
                        ? "Falta RUC o direccion"
                        : documentType === "boleta"
                          ? "Falta DNI o CE valido"
                          : "Confirma el cliente"}
                </span>

                <div className="flex flex-wrap items-center gap-2 justify-self-end">
                  {customerStepReady ? (
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={() => goToPayment()}
                      className="rounded-lg px-3"
                    >
                      Ir a cobro
                    </Button>
                  ) : null}

                  {canEditSelectedCustomer ? (
                    <button
                      type="button"
                      onClick={() => openCustomerSheet("edit")}
                      className="sales-field-interactive inline-flex items-center gap-1.5 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text)] transition"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  ) : null}

                  {genericCustomer &&
                  !isGenericCustomerSelected ? (
                    <button
                      type="button"
                      onClick={() =>
                        selectCustomer(genericCustomer)
                      }
                      className="inline-flex cursor-pointer items-center rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:bg-[var(--ripnel-accent-soft)]"
                    >
                      Usar mostrador
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {selectedCustomer && !customerStepReady ? (
            <div
              className={`rounded-lg border px-3 py-2.5 text-sm ${buildSemanticChipClass("warning")}`}
            >
              {documentType === "boleta"
                ? "Para boleta debes seleccionar un cliente con DNI o CE valido."
                : documentType === "factura"
                  ? "Para factura debes seleccionar un cliente con RUC y direccion fiscal."
                  : "Confirma a quien corresponde la venta antes de pasar al cobro."}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
