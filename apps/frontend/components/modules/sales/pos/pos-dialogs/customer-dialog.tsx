"use client"

import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PosCustomerForm } from "@/components/modules/customers/pos-customer-form"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { apiFetchData } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import {
  findDuplicateCustomerByDocument,
  mapCustomerSaveError,
} from "@/components/modules/customers/customer-document-guard"
import type { CustomerFormErrors, CustomerFormState, PosCustomer } from "../pos-types"
import { POS } from "../pos-messages"
import {
  buildCustomerFormFromCustomer,
  buildCustomerPayload,
  createEmptyCustomerForm,
  validateCustomerForm,
} from "../pos-customer-utils"

export function CustomerDialog({
  open,
  onOpenChange,
  mode,
  selectedCustomer,
  documentType,
  onSaved,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  selectedCustomer: PosCustomer | null
  documentType: string
  onSaved: (customer: PosCustomer) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<CustomerFormState>(() =>
    createEmptyCustomerForm(documentType === "factura" ? "factura" : "retail"),
  )
  const [errors, setErrors] = useState<CustomerFormErrors | null>(null)
  const [actionState, setActionState] = useState<"idle" | "validating" | "saving">("idle")
  const isBusy = actionState !== "idle"

  useEffect(() => {
    if (!open) return
    void Promise.resolve().then(() => {
      setErrors(null)
      setForm(
        mode === "edit" && selectedCustomer
          ? buildCustomerFormFromCustomer(selectedCustomer)
          : createEmptyCustomerForm(documentType === "factura" ? "factura" : "retail"),
      )
    })
  }, [documentType, mode, open, selectedCustomer])

  function close() {
    onClose()
    onOpenChange(false)
  }

  async function save() {
    const validation = validateCustomerForm(form)
    if (validation) {
      setErrors(validation)
      return
    }

    setActionState("validating")
    setErrors(null)
    try {
      const payload = buildCustomerPayload(form)
      const duplicateCustomer = await findDuplicateCustomerByDocument({
        documentType: form.document_type,
        documentNumber: form.document_number,
        excludeCustomerId: selectedCustomer?.customer_id ?? null,
      })

      if (duplicateCustomer) {
        setErrors({ document_number: POS.customer.duplicateError })
        return
      }

      setActionState("saving")
      const response =
        mode === "edit" && selectedCustomer?.customer_id
          ? await apiFetchData<PosCustomer>(`/api/customers/${selectedCustomer.customer_id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : await apiFetchData<PosCustomer>("/api/customers", {
              method: "POST",
              body: JSON.stringify(payload),
            })
      onSaved(response)
      showSuccess(POS.customer.saved, POS.customer.savedDesc)
    } catch (error) {
      const message = mapCustomerSaveError(error)
      setErrors({ document_number: message })
      showError(POS.customer.saveError, message)
    } finally {
      setActionState("idle")
    }
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title={mode === "edit" ? POS.customer.editTitle : POS.customer.createTitle}
      description={mode === "edit" ? POS.customer.editDesc : POS.customer.createDesc}
      size="sm"
      bodyClassName="space-y-2.5"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close} disabled={isBusy}>
            {POS.customer.cancel}
          </Button>
          <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={save} disabled={isBusy}>
            {actionState === "validating" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {POS.customer.validating}
              </span>
            ) : actionState === "saving" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {POS.customer.saving}
              </span>
            ) : (
              POS.customer.saveButton
            )}
          </Button>
        </div>
      }
    >
      <PosCustomerForm form={form} errors={errors} onChange={setForm} />
    </OpsDialog>
  )
}
