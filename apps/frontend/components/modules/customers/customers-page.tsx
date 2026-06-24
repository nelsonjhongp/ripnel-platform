"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  PencilLine,
  Plus,
  Power,
  RotateCcw,
  Search,
  Download,
  Mail,
  Phone,
  StickyNote,
  LoaderCircle,
} from "lucide-react"

import { AdminConfirmModal, AdminRowActionsMenu } from "@/components/admin/admin-ui"
import {
  buildDisplayName,
  buildCustomerPayload,
  CustomerForm,
  CustomerFormState,
  CustomerFormErrors,
  CUSTOMER_TYPE_LABELS,
  CustomerRecord,
  DOC_TYPE_LABELS,
  EMPTY_FORM,
  formatCustomerDate,
  toFormState,
  validateCustomerInput,
} from "./customer-form"
import {
  findDuplicateCustomerByDocument,
  mapCustomerSaveError,
} from "./customer-document-guard"
import { Button } from "@/components/ui/button"
import { OpsSelect } from "@/components/ui/ops-selection"
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { Pagination } from "@/components/ui/pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { CUSTOMER_TYPE_PILL } from "@/components/ui/ops-control-styles"
import { apiFetch, apiFetchData } from "@/lib/api"
import { showSuccess, showError } from "@/lib/toast"
import { exportToCsv } from "@/lib/export-csv"
import { useApiGet } from "@/hooks/use-api-get"
import { useDebounce } from "@/hooks/use-debounce"
import { activeBadgeLabel } from "@/lib/badge-utils"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { appRoutes } from "@/lib/routes"
import { CUSTOMERS } from "./customers-messages"

export default function CustomersPage() {
  const [query, setQuery] = useState("")
  const [docFilter, setDocFilter] = useState("all")
  const [sort, setSort] = useState<"desc" | "asc">("desc")

  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)
  const [editState, setEditState] = useState<CustomerFormState>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<CustomerFormErrors | null>(null)
  const [editActionState, setEditActionState] = useState<"idle" | "validating" | "saving">("idle")

  const [createOpen, setCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<CustomerFormState>(EMPTY_FORM)
  const [createErrors, setCreateErrors] = useState<CustomerFormErrors | null>(null)
  const [createActionState, setCreateActionState] = useState<"idle" | "validating" | "saving">("idle")

  const [activeChangeCustomer, setActiveChangeCustomer] = useState<CustomerRecord | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 20

  const debouncedQuery = useDebounce(query, 300)

  const { data: customersResponse, loading, error, refetch: refetchCustomers } = useApiGet(
    () => {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim())
      if (docFilter !== "all") params.set("document_type", docFilter)
      params.set("sort", sort)
      params.set("page", String(page))
      params.set("limit", String(pageSize))
      const url = `/api/customers?${params.toString()}`
      return apiFetch<{ ok: boolean; data: CustomerRecord[]; total: number }>(url, { cache: "no-store" })
        .then((res) => ({ data: res.data, total: res.total }))
    },
    [debouncedQuery, docFilter, sort, page],
  )
  const customers = customersResponse?.data ?? []
  const total = customersResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))
  const firstVisible = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const lastVisible = Math.min(safePage * pageSize, total)

  useEffect(() => {
    if (editingCustomer) {
      void Promise.resolve().then(() => {
        setEditErrors(null)
      })
    }
  }, [editingCustomer])

  useEffect(() => {
    if (createOpen) {
      void Promise.resolve().then(() => {
        setCreateErrors(null)
        setCreateState(EMPTY_FORM)
        setCreateActionState("idle")
      })
    }
  }, [createOpen])

  function clearFilters() {
    setQuery("")
    setDocFilter("all")
    setSort("desc")
    setPage(1)
  }
  function openEditModal(customer: CustomerRecord) {
    setEditingCustomer(customer)
    setEditState(toFormState(customer))
  }

  function closeEditModal() {
    setEditingCustomer(null)
    setEditState(EMPTY_FORM)
    setEditActionState("idle")
    setEditErrors(null)
  }

  function openCreateModal() {
    setCreateOpen(true)
  }

  function closeCreateModal() {
    setCreateOpen(false)
    setCreateState(EMPTY_FORM)
    setCreateErrors(null)
    setCreateActionState("idle")
  }

  async function saveEdit() {
    if (!editingCustomer) return

    const validation = validateCustomerInput(editState)
    if (validation) {
      setEditErrors(validation)
      return
    }

    setEditActionState("validating")
    setEditErrors(null)

    try {
      const duplicateCustomer = await findDuplicateCustomerByDocument({
        documentType: editState.document_type,
        documentNumber: editState.document_number,
        excludeCustomerId: editingCustomer.customer_id,
      })

      if (duplicateCustomer) {
        setEditErrors({ document_number: CUSTOMERS.dialog.duplicateError })
        setEditActionState("idle")
        return
      }

      setEditActionState("saving")
      await apiFetchData<CustomerRecord>(`/api/customers/${editingCustomer.customer_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(editState)),
      })

      refetchCustomers()
      closeEditModal()
      showSuccess(CUSTOMERS.toast.updated, buildDisplayName(editingCustomer))
    } catch (submitError: unknown) {
      const message = mapCustomerSaveError(submitError)
      setEditErrors({ document_number: message })
      showError(CUSTOMERS.toast.saveError, message)
    } finally {
      setEditActionState("idle")
    }
  }

  async function handleCreateCustomer() {
    const validation = validateCustomerInput(createState)
    if (validation) {
      setCreateErrors(validation)
      return
    }

    setCreateActionState("validating")
    setCreateErrors(null)

    try {
      const duplicateCustomer = await findDuplicateCustomerByDocument({
        documentType: createState.document_type,
        documentNumber: createState.document_number,
      })

      if (duplicateCustomer) {
        setCreateErrors({ document_number: CUSTOMERS.dialog.duplicateError })
        setCreateActionState("idle")
        return
      }

      setCreateActionState("saving")
      await apiFetchData("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(createState)),
      })

      refetchCustomers()
      showSuccess(CUSTOMERS.toast.created)
      closeCreateModal()
    } catch (submitError: unknown) {
      const message = mapCustomerSaveError(submitError)
      setCreateErrors({ document_number: message })
      showError(CUSTOMERS.toast.saveError, message)
    } finally {
      setCreateActionState("idle")
    }
  }

  async function changeCustomerActiveState() {
    if (!activeChangeCustomer) return

    setSavingActiveChange(true)

    try {
      await apiFetchData<CustomerRecord>(`/api/customers/${activeChangeCustomer.customer_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !activeChangeCustomer.active }),
      })

      refetchCustomers()
      if (editingCustomer?.customer_id === activeChangeCustomer.customer_id) {
        setEditingCustomer(null)
        setEditState(EMPTY_FORM)
      }
      const wasActive = activeChangeCustomer.active
      setActiveChangeCustomer(null)
      showSuccess(
        wasActive ? CUSTOMERS.toast.deactivated : CUSTOMERS.toast.activated,
        buildDisplayName(activeChangeCustomer),
      )
    } catch (submitError: unknown) {
      showError(CUSTOMERS.toast.updateError, submitError instanceof Error ? submitError.message : CUSTOMERS.dialog.saveError)
    } finally {
      setSavingActiveChange(false)
    }
  }

  const docFilterOptions = [
    { value: "all", label: "Todos" },
    { value: "dni", label: "DNI" },
    { value: "ruc", label: "RUC" },
    { value: "ce", label: "CE" },
    { value: "passport", label: "Pasaporte" },
    { value: "none", label: "Sin doc." },
  ]

  const sortOptions = [
    { value: "desc", label: CUSTOMERS.filters.orderNewest },
    { value: "asc", label: CUSTOMERS.filters.orderOldest },
  ]

  const hasActiveFilters = query.trim().length > 0 || docFilter !== "all" || sort !== "desc"

  function handleExport() {
    const headers = [...CUSTOMERS.export.headers]
    const rows = (customersResponse?.data || []).map((c) => [
      c.internal_code || CUSTOMERS.fallback.dash,
      (c.full_name || c.business_name || c.commercial_name || CUSTOMERS.fallback.dash),
      c.document_type,
      c.document_number || CUSTOMERS.fallback.dash,
      c.business_name || CUSTOMERS.fallback.dash,
      CUSTOMER_TYPE_LABELS[c.customer_type] || c.customer_type,
      c.email || CUSTOMERS.fallback.dash,
      c.phone || CUSTOMERS.fallback.dash,
      c.active ? CUSTOMERS.export.yes : CUSTOMERS.export.no,
      formatCustomerDate(c.created_at),
    ])
    exportToCsv(CUSTOMERS.export.filename, headers, rows)
  }

  const editIsBusy = editActionState !== "idle"
  const createIsBusy = createActionState !== "idle"

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow={CUSTOMERS.header.eyebrow}
          title={CUSTOMERS.header.title}
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={handleExport}
                    disabled={!customersResponse || customers.length === 0}
                    aria-label={CUSTOMERS.actions.exportCsv}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {CUSTOMERS.actions.exportCsv}
                </TooltipContent>
              </Tooltip>
              <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                <Link href={`${appRoutes.businessIntelligence}?view=clientes`}>{CUSTOMERS.actions.biDashboards}</Link>
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                className="rounded-lg px-3"
                onClick={openCreateModal}
              >
                <Plus className="h-4 w-4" />
                {CUSTOMERS.actions.newCustomer}
              </Button>
            </>
          }
        />

        <OpsSectionDivider>
          <OpsTableBlock>
            <OpsFiltersRow>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {CUSTOMERS.filters.searchLabel}
                </label>
                <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                  <Search className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setPage(1)
                    }}
                    placeholder={CUSTOMERS.filters.searchPlaceholder}
                    className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                  />
                </div>
              </div>

              <OpsSelect
                label={CUSTOMERS.filters.docTypeLabel}
                value={docFilter}
                options={docFilterOptions}
                onChange={(value) => {
                  setDocFilter(value)
                  setPage(1)
                }}
              />

              <OpsSelect
                label={CUSTOMERS.filters.orderLabel}
                value={sort}
                options={sortOptions}
                onChange={(v) => {
                  setSort(v as "desc" | "asc")
                  setPage(1)
                }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    aria-label={CUSTOMERS.filters.clearFilters}
                    className="mt-auto h-10 w-10 rounded-lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {CUSTOMERS.filters.clearFilters}
                </TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            {!loading && !error && total === 0 ? (
              <OpsEmptyState variant="compact" description={CUSTOMERS.table.empty} />
            ) : (
              <OpsDataTable
                columns={[
                  { key: "cliente", header: CUSTOMERS.table.columns.customer },
                  { key: "documento", header: CUSTOMERS.table.columns.document },
                  { key: "contacto", header: CUSTOMERS.table.columns.contact },
                  { key: "tipo", header: CUSTOMERS.table.columns.type },
                  { key: "estado", header: CUSTOMERS.table.columns.status },
                  { key: "alta", header: CUSTOMERS.table.columns.created },
                  { key: "acciones", header: "", className: "w-[4.5rem] text-right" },
                ]}
                minWidth="1080px"
                loading={loading}
                loadingMessage={CUSTOMERS.table.loading}
                error={error}
                errorTitle={CUSTOMERS.table.errorTitle}
                footer={
                  <>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {total === 0
                        ? CUSTOMERS.table.zeroResults
                        : CUSTOMERS.table.results(firstVisible, lastVisible, total)}
                    </span>
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      className="self-end md:self-auto"
                    />
                  </>
                }
              >
                {customers.map((customer) => (
                  <tr
                    key={customer.customer_id}
                    className={`transition hover:bg-[var(--ops-surface-muted)] ${!customer.active ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className={`text-sm font-semibold text-[var(--ops-text)] ${!customer.active ? "line-through" : ""}`}>
                        {buildDisplayName(customer)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {customer.internal_code || CUSTOMERS.table.noCode}
                        </p>
                        {customer.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-default">
                                <StickyNote className="h-3.5 w-3.5 text-[var(--ops-text-muted)]" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={4} className="max-w-64 whitespace-pre-wrap text-xs">
                              {customer.notes.length > 80 ? `${customer.notes.slice(0, 80)}...` : customer.notes}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="text-sm text-[var(--ops-text)]">
                        {customer.document_number || CUSTOMERS.table.noDocument}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {DOC_TYPE_LABELS[customer.document_type] || customer.document_type}
                      </p>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="flex items-center gap-1 text-sm text-[var(--ops-text)]">
                        <Mail className="h-3 w-3 shrink-0 text-[var(--ops-text-muted)]" />
                        {customer.email || CUSTOMERS.table.noEmail}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        <Phone className="h-3 w-3 shrink-0" />
                        {customer.phone || CUSTOMERS.table.noPhone}
                      </p>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <span className={CUSTOMER_TYPE_PILL}>
                        {CUSTOMER_TYPE_LABELS[customer.customer_type] || customer.customer_type}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <OpsStatusBadge tone={customer.active ? "success" : "neutral"}>
                        {activeBadgeLabel(customer.active)}
                      </OpsStatusBadge>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] text-xs text-[var(--ops-text-muted)]">
                      {formatCustomerDate(customer.created_at)}
                    </td>
                    <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)]">
                      <AdminRowActionsMenu
                        ariaLabel={CUSTOMERS.actions.actionsFor(buildDisplayName(customer))}
                        items={[
                          {
                            label: CUSTOMERS.actions.edit,
                            icon: <PencilLine className="h-3.5 w-3.5" />,
                            onSelect: () => openEditModal(customer),
                          },
                          {
                            label: customer.active ? CUSTOMERS.actions.inactivate : CUSTOMERS.actions.activate,
                            icon: <Power className="h-3.5 w-3.5" />,
                            tone: customer.active ? "danger" : "neutral",
                            onSelect: () => setActiveChangeCustomer(customer),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            )}
          </OpsTableBlock>
        </OpsSectionDivider>

        {editingCustomer ? (
          <OpsDialog
            open={!!editingCustomer}
            onOpenChange={(open) => { if (!open) closeEditModal() }}
            title={CUSTOMERS.dialog.editTitle}
            description={CUSTOMERS.dialog.editDesc}
            size="md"
            bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" className="rounded-lg px-4" onClick={closeEditModal} disabled={editIsBusy}>
                  {CUSTOMERS.dialog.cancel}
                </Button>
                <Button variant="accent" size="sm" className="rounded-lg px-4" onClick={saveEdit} disabled={editIsBusy}>
                  {editActionState === "validating" ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {CUSTOMERS.dialog.validating}
                    </span>
                  ) : editActionState === "saving" ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {CUSTOMERS.dialog.saving}
                    </span>
                  ) : (
                    CUSTOMERS.dialog.saveEdit
                  )}
                </Button>
              </div>
            }
          >
            <CustomerForm
              mode="edit"
              state={editState}
              errors={editErrors}
              onChange={setEditState}
            />
          </OpsDialog>
        ) : null}

        <OpsDialog
          open={createOpen}
          onOpenChange={(open) => { if (!open) closeCreateModal() }}
          title={CUSTOMERS.dialog.createTitle}
          description={CUSTOMERS.dialog.createDesc}
          size="md"
          bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg px-4"
                onClick={closeCreateModal}
                disabled={createIsBusy}
              >
                {CUSTOMERS.dialog.cancel}
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="rounded-lg px-4"
                onClick={handleCreateCustomer}
                disabled={createIsBusy}
              >
                {createActionState === "validating" ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {CUSTOMERS.dialog.validating}
                  </span>
                ) : createActionState === "saving" ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {CUSTOMERS.dialog.saving}
                  </span>
                ) : (
                  CUSTOMERS.dialog.saveCreate
                )}
              </Button>
            </div>
          }
        >
          <CustomerForm
            mode="create"
            state={createState}
            errors={createErrors}
            onChange={setCreateState}
          />
        </OpsDialog>

        <AdminConfirmModal
          open={Boolean(activeChangeCustomer)}
          title={activeChangeCustomer?.active ? CUSTOMERS.dialog.activeTitle : CUSTOMERS.dialog.inactiveTitle}
          description={
            activeChangeCustomer ? (
              <>
                {CUSTOMERS.dialog.activeDesc(buildDisplayName(activeChangeCustomer), activeChangeCustomer.active)}
              </>
            ) : null
          }
          confirmLabel={activeChangeCustomer?.active ? CUSTOMERS.dialog.confirmInactivate : CUSTOMERS.dialog.confirmActivate}
          confirmTone={activeChangeCustomer?.active ? "danger" : "accent"}
          busy={savingActiveChange}
          onCancel={() => setActiveChangeCustomer(null)}
          onConfirm={() => void changeCustomerActiveState()}
        />
      </OpsPageShell>
    </TooltipProvider>
  )
}
