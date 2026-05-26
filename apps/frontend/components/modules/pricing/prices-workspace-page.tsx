"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Building2, LoaderCircle, PencilLine, Plus, RefreshCw, Save, Settings2, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  OpsSectionDivider,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  createPrice,
  fetchPriceWorkspace,
} from "@/lib/api-prices"
import type {
  PriceType,
  PriceWorkspace,
} from "@/lib/prices-types"
import { cn } from "@/lib/utils"

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "-"

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

function getTodayInputValue() {
  const current = new Date()
  const year = current.getFullYear()
  const month = String(current.getMonth() + 1).padStart(2, "0")
  const day = String(current.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function priceTypeLabel(priceType: PriceType) {
  return priceType === "retail" ? "Minorista" : "Mayorista"
}

const NEW_PRICE_RECORD_ID = "__new__"

function resetPriceDraftState(
  setPriceInput: (value: string) => void,
  setStartDateInput: (value: string) => void,
  setEndDateInput: (value: string) => void,
  setActiveInput: (value: boolean) => void
) {
  setPriceInput("")
  setStartDateInput(getTodayInputValue())
  setEndDateInput("")
  setActiveInput(true)
}

export function PricesWorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedStyleId = searchParams.get("style_id") || ""

  const [workspace, setWorkspace] = useState<PriceWorkspace | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  const [selectedSizeId, setSelectedSizeId] = useState("")
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("retail")
  const [selectedPriceRecordId, setSelectedPriceRecordId] = useState("")
  const [priceInput, setPriceInput] = useState("")
  const [startDateInput, setStartDateInput] = useState(getTodayInputValue())
  const [endDateInput, setEndDateInput] = useState("")
  const [activeInput, setActiveInput] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const clearSubmitFeedback = useCallback(() => {
    setSubmitError(null)
    setSubmitMessage(null)
  }, [])

  const resetDraft = useCallback(() => {
    resetPriceDraftState(setPriceInput, setStartDateInput, setEndDateInput, setActiveInput)
  }, [])

  const loadWorkspace = useCallback(async (styleId: string) => {
    if (!styleId) {
      setWorkspace(null)
      return
    }

    setWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      const data = await fetchPriceWorkspace(styleId)
      setWorkspace(data)
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "No se pudo cargar el workspace")
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      setSelectedSizeId("")
      setSelectedPriceType("retail")
      setSelectedPriceRecordId("")
      resetDraft()
      clearSubmitFeedback()
      await loadWorkspace(selectedStyleId)
    })
  }, [clearSubmitFeedback, loadWorkspace, resetDraft, selectedStyleId])

  useEffect(() => {
    if (!selectedStyleId) {
      router.replace("/precios")
    }
  }, [selectedStyleId, router])

  const resolvedSelectedSizeId = useMemo(() => {
    if (!workspace) {
      return ""
    }

    if (selectedSizeId && workspace.configured_sizes.some((size) => size.size_id === selectedSizeId)) {
      return selectedSizeId
    }

    return workspace.configured_sizes[0]?.size_id || ""
  }, [selectedSizeId, workspace])

  const selectedSize = useMemo(
    () => workspace?.configured_sizes.find((size) => size.size_id === resolvedSelectedSizeId) || null,
    [resolvedSelectedSizeId, workspace]
  )

  const matchingRows = useMemo(() => {
    if (!workspace || !resolvedSelectedSizeId) {
      return []
    }

    return [...workspace.price_rows]
      .filter(
        (row) => row.size_id === resolvedSelectedSizeId && row.price_type === selectedPriceType
      )
      .sort((left, right) => right.start_date.localeCompare(left.start_date))
  }, [resolvedSelectedSizeId, selectedPriceType, workspace])

  const activeSelectedPriceRecordId = useMemo(() => {
    if (selectedPriceRecordId === NEW_PRICE_RECORD_ID) {
      return ""
    }

    if (
      selectedPriceRecordId &&
      matchingRows.some((row) => row.style_size_price_id === selectedPriceRecordId)
    ) {
      return selectedPriceRecordId
    }

    return matchingRows[0]?.style_size_price_id || ""
  }, [matchingRows, selectedPriceRecordId])

  const selectedRow = useMemo(
    () =>
      matchingRows.find((row) => row.style_size_price_id === activeSelectedPriceRecordId) || null,
    [activeSelectedPriceRecordId, matchingRows]
  )

  const handleSelectPriceLane = useCallback(
    (sizeId: string, priceType: PriceType) => {
      setSelectedSizeId(sizeId)
      setSelectedPriceType(priceType)
      setSelectedPriceRecordId("")
      resetDraft()
      clearSubmitFeedback()
    },
    [clearSubmitFeedback, resetDraft]
  )

  const handleSelectPriceType = useCallback(
    (priceType: PriceType) => {
      setSelectedPriceType(priceType)
      setSelectedPriceRecordId("")
      resetDraft()
      clearSubmitFeedback()
    },
    [clearSubmitFeedback, resetDraft]
  )

  const handleStartNewRecord = useCallback(() => {
    setSelectedPriceRecordId(NEW_PRICE_RECORD_ID)
    resetDraft()
    clearSubmitFeedback()
  }, [clearSubmitFeedback, resetDraft])

  const handleRefreshWorkspace = useCallback(() => {
    clearSubmitFeedback()
    void loadWorkspace(selectedStyleId)
  }, [clearSubmitFeedback, loadWorkspace, selectedStyleId])

  async function handleSubmit() {
    if (!workspace || !selectedSize) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    try {
      const payload = {
        style_id: workspace.product.style_id,
        size_id: selectedSize.size_id,
        price_type: selectedPriceType,
        price: Number(priceInput),
        start_date: startDateInput,
        end_date: endDateInput || null,
        active: activeInput,
      }

      const savedRow = await createPrice(payload)

      await loadWorkspace(workspace.product.style_id)
      setSelectedPriceRecordId(savedRow.style_size_price_id)
      setSubmitMessage("Precio creado correctamente")
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      setSubmitError(
        msg.includes("already exists")
          ? "Ya existe un precio para esta combinacion y fecha. Cambia la fecha de inicio o usa otra vigencia."
          : msg || "No se pudo guardar el precio"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <PosHeader
        eyebrow="Precios"
        title="Gestion de precios"
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handleRefreshWorkspace}
                  disabled={workspaceLoading}
                  aria-label="Actualizar"
                  className="rounded-lg"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      workspaceLoading ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Actualizar
              </TooltipContent>
            </Tooltip>

            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href="/precios">
              <ArrowLeft className="h-4 w-4" />
              Volver
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href="/precios/reglas">
                <Settings2 className="h-4 w-4" />
                Reglas
              </Link>
            </Button>
          </>
        }
      />

      {selectedStyleId ? (
        <>

          {workspace ? (
            <div className="flex flex-wrap items-center gap-2">
              <OpsMetricPill label="Tallas" value={workspace.product.configured_size_count} />
              <OpsMetricPill
                label="Retail cubierto"
                value={workspace.product.retail_sizes_covered_count}
                tone="accent"
              />
              <OpsMetricPill
                label="Mayorista cubierto"
                value={workspace.product.wholesale_sizes_covered_count}
              />
              <OpsMetricPill
                label="Stock"
                value={workspace.product.total_stock_qty}
                tone={workspace.product.total_stock_qty > 0 ? "success" : "default"}
              />
            </div>
          ) : null}

          <OpsSectionDivider>
            {workspaceLoading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-[var(--ops-text-muted)]">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Cargando workspace...
              </div>
            ) : workspaceError ? (
              <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-8 text-sm text-[var(--ops-text-muted)]">
                {workspaceError}
              </div>
            ) : workspace ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--ops-text)]">
                        {workspace.product.name}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {workspace.product.style_code || "Sin código"}
                      </p>
                    </div>

                  </div>

                   <OpsTableWrap minWidth="640px">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface-muted)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                           <th className="px-4 py-3">Talla</th>
                           <th className="px-4 py-3">Retail</th>
                           <th className="px-4 py-3">Mayorista</th>
                           <th className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {workspace.configured_sizes.map((size) => {
                          const selected = size.size_id === resolvedSelectedSizeId

                          return (
                            <tr
                              key={size.size_id}
                              className={cn(
                                selected && "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,var(--ops-surface))]"
                              )}
                            >
                              <td className="px-4 py-[var(--ops-row-py)] align-top">
                                <p className="text-sm font-semibold text-[var(--ops-text)]">
                                  {size.code}
                                </p>
                                <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                                  {size.name || "Sin nombre"}
                                </p>
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)]">
                                {size.has_current_retail_price && size.current_retail_price !== null ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg min-w-[120px]"
                                    onClick={() => handleSelectPriceLane(size.size_id, "retail")}
                                  >
                                    S/. {size.current_retail_price.toFixed(2)}
                                    <PencilLine className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg border-dashed text-[var(--ops-text-muted)] opacity-80 min-w-[120px]"
                                    onClick={() => handleSelectPriceLane(size.size_id, "retail")}
                                  >
                                    Sin precio
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)]">
                                {size.has_current_wholesale_price && size.current_wholesale_price !== null ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg min-w-[120px]"
                                    onClick={() => handleSelectPriceLane(size.size_id, "wholesale")}
                                  >
                                    S/. {size.current_wholesale_price.toFixed(2)}
                                    <PencilLine className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg border-dashed text-[var(--ops-text-muted)] opacity-80 min-w-[120px]"
                                    onClick={() => handleSelectPriceLane(size.size_id, "wholesale")}
                                  >
                                    Sin precio
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)]">
                                {size.has_current_retail_price && size.has_current_wholesale_price ? (
                                  <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]">
                                    Completo
                                  </span>
                                ) : !size.has_current_retail_price && !size.has_current_wholesale_price ? (
                                  <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
                                    Faltan precios
                                  </span>
                                ) : !size.has_current_retail_price ? (
                                  <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                                    Falta retail
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                                    Falta mayorista
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </OpsTableWrap>
                </div>

                <aside className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
                  <div className="inline-flex w-full rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPriceType("retail")}
                      className={`cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        selectedPriceType === "retail"
                          ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                          : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Minorista
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPriceType("wholesale")}
                      className={`cursor-pointer inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        selectedPriceType === "wholesale"
                          ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                          : "text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Mayorista
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[var(--ops-border-strong)] pt-4">
                    <h3 className="text-base font-semibold text-[var(--ops-text)]">
                      {selectedSize ? `Talla ${selectedSize.code}` : "Selecciona una talla"}
                    </h3>
                    {selectedSize ? (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {priceTypeLabel(selectedPriceType)}
                      </p>
                    ) : null}
                  </div>

                  {selectedSize ? (
                    <div className="mt-4 space-y-4">
                      {activeSelectedPriceRecordId ? (
                        <>
                          {selectedRow ? (
                            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 space-y-2">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                {formatCurrency(selectedRow.price)}
                              </p>
                              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)] space-y-0.5">
                                <p>Desde {formatDate(selectedRow.start_date)}</p>
                                {selectedRow.end_date ? (
                                  <p>Hasta {formatDate(selectedRow.end_date)}</p>
                                ) : null}
                              </div>
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                selectedRow.active
                                  ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
                                  : "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                              }`}>
                                {selectedRow.active ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-4 text-center text-xs text-[var(--ops-text-muted)]">
                              Sin registro de vigencia
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleStartNewRecord}
                            className="cursor-pointer text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
                          >
                            + Nuevo registro
                          </button>

                          {submitMessage ? (
                            <div className="rounded-lg border border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]">
                              {submitMessage}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                              Precio
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={priceInput}
                              onChange={(event) => setPriceInput(event.target.value)}
                              placeholder={
                                selectedPriceType === "retail" && selectedSize?.current_retail_price != null
                                  ? `Actual: S/. ${selectedSize.current_retail_price.toFixed(2)}`
                                  : selectedPriceType === "wholesale" && selectedSize?.current_wholesale_price != null
                                    ? `Actual: S/. ${selectedSize.current_wholesale_price.toFixed(2)}`
                                    : "0.00"
                              }
                              className="sales-field h-10 w-full rounded-lg px-3 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                            />
                          </div>

                          <div className="space-y-3">
                            <DateFilterPicker
                              label="Inicio"
                              value={startDateInput}
                              onChange={setStartDateInput}
                              ariaLabel="Fecha de inicio"
                            />
                            <DateFilterPicker
                              label="Fin"
                              value={endDateInput}
                              onChange={setEndDateInput}
                              ariaLabel="Fecha de fin"
                              min={startDateInput || undefined}
                            />
                          </div>

                          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--ops-text)]">
                            <input
                              type="checkbox"
                              checked={activeInput}
                              onChange={(event) => setActiveInput(event.target.checked)}
                              className="h-4 w-4 rounded border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
                            />
                            Registro activo
                          </label>

                          {submitMessage ? (
                            <div className="rounded-lg border border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]">
                              {submitMessage}
                            </div>
                          ) : null}

                          {submitError ? (
                            <div className="rounded-lg border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
                              {submitError}
                            </div>
                          ) : null}

                          <Button
                            type="button"
                            variant="accent"
                            size="sm"
                            className="w-full rounded-lg px-3"
                            onClick={() => void handleSubmit()}
                            disabled={
                              submitting ||
                              !priceInput.trim() ||
                              !startDateInput.trim() ||
                              Number.isNaN(Number(priceInput))
                            }
                          >
                            {submitting ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Crear precio
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                      Selecciona una talla para editar.
                    </div>
                  )}
                </aside>
              </div>
            ) : null}
          </OpsSectionDivider>
        </>
      ) : (
        <div className="flex min-h-48 items-center justify-center text-sm text-[var(--ops-text-muted)]">
          Redirigiendo al listado de precios...
        </div>
      )}
    </TooltipProvider>
  )
}
