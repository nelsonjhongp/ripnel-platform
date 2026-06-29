"use client"

import { useEffect, useMemo, useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { ApiError, apiFetchData } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import { ProductCreateForm } from "./product-create-form"
import { PRODUCTS } from "./products-messages"
import type {
  CreatedProductStyle,
  ExistingProductStyle,
  GeneratedProductVariants,
  ProductCreateActionState,
  ProductCreateCatalogItem,
  ProductCreateFieldName,
  ProductCreateFormErrors,
  ProductCreateFormState,
} from "./products-types"
import {
  buildProductNameDuplicateIndex,
  buildProductStylePayload,
  deriveProductCreateErrorsAfterChange,
  EMPTY_PRODUCT_CREATE_FORM,
  getFirstProductCreateErrorField,
  PRODUCT_CREATE_FIELD_IDS,
  validateProductCreateInput,
} from "./products-utils"

type ProductCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (style: CreatedProductStyle) => void
}

async function requestCreateCatalogData() {
  const [garmentTypes, sizes, colors, existingStyles] = await Promise.all([
    apiFetchData<ProductCreateCatalogItem[]>("/api/garment-types", {
      cache: "no-store",
    }),
    apiFetchData<ProductCreateCatalogItem[]>("/api/sizes", {
      cache: "no-store",
    }),
    apiFetchData<ProductCreateCatalogItem[]>("/api/colors", {
      cache: "no-store",
    }),
    apiFetchData<ExistingProductStyle[]>("/api/styles", {
      cache: "no-store",
    }),
  ])

  return { garmentTypes, sizes, colors, existingStyles }
}

async function requestExistingStyles() {
  return apiFetchData<ExistingProductStyle[]>("/api/styles", {
    cache: "no-store",
  })
}

function isUniqueColor(color: ProductCreateCatalogItem) {
  return String(color.code || "").trim().toUpperCase() === "UNICO"
}

function isDuplicateProductNameApiError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    /style already exists|producto|product/i.test(error.message)
  )
}

function focusProductCreateField(errors: ProductCreateFormErrors | null) {
  const firstField = getFirstProductCreateErrorField(errors)
  if (!firstField) return

  window.requestAnimationFrame(() => {
    const element = document.getElementById(PRODUCT_CREATE_FIELD_IDS[firstField])
    element?.focus({ preventScroll: true })
    element?.scrollIntoView({ behavior: "smooth", block: "center" })
  })
}

export function ProductCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: ProductCreateDialogProps) {
  const [form, setForm] = useState<ProductCreateFormState>(EMPTY_PRODUCT_CREATE_FORM)
  const [errors, setErrors] = useState<ProductCreateFormErrors | null>(null)
  const [actionState, setActionState] =
    useState<ProductCreateActionState>("idle")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [garmentTypes, setGarmentTypes] = useState<ProductCreateCatalogItem[]>([])
  const [sizes, setSizes] = useState<ProductCreateCatalogItem[]>([])
  const [colors, setColors] = useState<ProductCreateCatalogItem[]>([])
  const [existingStyles, setExistingStyles] = useState<ExistingProductStyle[]>([])

  const isBusy = actionState !== "idle"
  const duplicateNameIndex = useMemo(
    () => buildProductNameDuplicateIndex(existingStyles),
    [existingStyles],
  )
  const validationContext = useMemo(
    () => ({
      activeSizeCount: sizes.filter((size) => size.active !== false).length,
      manualColorCount: colors.filter(
        (color) => color.active !== false && !isUniqueColor(color),
      ).length,
    }),
    [colors, sizes],
  )

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      setForm(EMPTY_PRODUCT_CREATE_FORM)
      setErrors(null)
      setActionState("idle")
      setLoading(true)
      setLoadError(null)

      try {
        const data = await requestCreateCatalogData()
        if (cancelled) return

        setGarmentTypes(data.garmentTypes)
        setSizes(data.sizes)
        setColors(data.colors)
        setExistingStyles(data.existingStyles)
      } catch (error) {
        if (cancelled) return

        const message =
          error instanceof Error ? error.message : PRODUCTS.create.loadError
        setLoadError(message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void Promise.resolve().then(load)

    return () => {
      cancelled = true
    }
  }, [open])

  function close() {
    if (isBusy) return
    onOpenChange(false)
  }

  function updateForm(
    next: ProductCreateFormState,
    field: ProductCreateFieldName,
  ) {
    setForm(next)
    setErrors((current) =>
      deriveProductCreateErrorsAfterChange({
        errors: current,
        field,
        state: next,
        duplicateIndex: duplicateNameIndex,
      }),
    )
  }

  async function save() {
    setActionState("validating")
    setErrors(null)

    const validation = validateProductCreateInput(
      form,
      duplicateNameIndex,
      validationContext,
    )
    if (validation) {
      setErrors(validation)
      focusProductCreateField(validation)
      setActionState("idle")
      return
    }

    try {
      const freshStyles = await requestExistingStyles()
      const freshDuplicateNameIndex = buildProductNameDuplicateIndex(freshStyles)
      const freshValidation = validateProductCreateInput(
        form,
        freshDuplicateNameIndex,
        validationContext,
      )

      setExistingStyles(freshStyles)

      if (freshValidation) {
        setErrors(freshValidation)
        focusProductCreateField(freshValidation)
        setActionState("idle")
        return
      }

      setActionState("saving")

      const style = await apiFetchData<CreatedProductStyle>("/api/styles", {
        method: "POST",
        body: JSON.stringify(buildProductStylePayload(form)),
      })

      await apiFetchData(`/api/variants/styles/${style.style_id}/config`, {
        method: "PUT",
        body: JSON.stringify({
          size_ids: form.size_ids,
          color_ids: form.use_unique_color ? [] : form.color_ids,
        }),
      })

      const generated = await apiFetchData<GeneratedProductVariants>(
        `/api/variants/styles/${style.style_id}/generate`,
        {
          method: "POST",
        },
      )

      showSuccess(
        PRODUCTS.create.created,
        PRODUCTS.create.createdDescription(
          style.name,
          generated.created_count || generated.total_possible || 0,
        ),
      )
      onOpenChange(false)
      onCreated?.(style)
    } catch (error) {
      if (isDuplicateProductNameApiError(error)) {
        const duplicateError = { name: PRODUCTS.form.errors.duplicateName }
        setErrors(duplicateError)
        focusProductCreateField(duplicateError)
        return
      }

      const message = error instanceof Error ? error.message : PRODUCTS.create.saveError
      setErrors({ _form: message })
      showError(PRODUCTS.create.saveError, message)
    } finally {
      setActionState("idle")
    }
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title={PRODUCTS.create.title}
      description={PRODUCTS.create.description}
      size="lg"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={close}
            disabled={isBusy}
          >
            {PRODUCTS.create.cancel}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={save}
            disabled={isBusy || loading || Boolean(loadError)}
          >
            {actionState === "validating" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {PRODUCTS.create.validating}
              </span>
            ) : actionState === "saving" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {PRODUCTS.create.saving}
              </span>
            ) : (
              PRODUCTS.create.submit
            )}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-[var(--ops-text-muted)]">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {PRODUCTS.create.loading}
          </span>
        </div>
      ) : loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2.5 text-sm text-[var(--ops-tone-danger-text)]"
        >
          {loadError}
        </p>
      ) : (
        <>
          {errors?._form ? (
            <p
              role="alert"
              className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2.5 text-sm text-[var(--ops-tone-danger-text)]"
            >
              {errors._form}
            </p>
          ) : null}
          <ProductCreateForm
            state={form}
            errors={errors}
            garmentTypes={garmentTypes}
            sizes={sizes}
            colors={colors}
            disabled={isBusy}
            onChange={updateForm}
          />
        </>
      )}
    </OpsDialog>
  )
}
