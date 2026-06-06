"use client"

import Link from "next/link"
import { useState } from "react"
import {
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react"

import { AdminConfirmModal, AdminModalShell, AdminRowActionsMenu } from "@/components/admin/admin-ui"
import { InlineStatusCard } from "@/components/feedback/status-page"
import {
  buildDisplayName,
  buildCustomerPayload,
  CustomerForm,
  CustomerFormState,
  CUSTOMER_TYPE_LABELS,
  CustomerRecord,
  DOC_TYPE_LABELS,
  EMPTY_FORM,
  formatCustomerDate,
  toFormState,
  validateCustomerInput,
} from "./customer-form"
import { Button } from "@/components/ui/button"
import { FilterDropdown } from "@/components/ui/filter-dropdown"
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
import { apiFetchData } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"
import { activeBadgeLabel } from "@/lib/badge-utils"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { usePagination } from "@/hooks/use-pagination"
import { appRoutes } from "@/lib/routes"

export default function CustomersPage() {
  const [query, setQuery] = useState("")
  const [docFilter, setDocFilter] = useState("all")
  const [sort, setSort] = useState<"desc" | "asc">("desc")
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)
  const [editState, setEditState] = useState<CustomerFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeChangeCustomer, setActiveChangeCustomer] = useState<CustomerRecord | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  // TODO: Add debounce to useApiGet or use a debounced query value
  const { data: customersData, loading, error, refetch: refetchCustomers } = useApiGet(
    () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (docFilter !== "all") params.set("document_type", docFilter)
      params.set("sort", sort)
      const url = `/api/customers${params.toString() ? `?${params.toString()}` : ""}`
      return apiFetchData<CustomerRecord[]>(url, { cache: "no-store" })
    },
    [query, docFilter, sort]
  )
  const customers = customersData ?? []

  function clearFilters() {
    setQuery("")
    setDocFilter("all")
    setSort("desc")
    setPage(1)
  }

  function openEditModal(customer: CustomerRecord) {
    setEditingCustomer(customer)
    setEditState(toFormState(customer))
    setSaveError(null)
  }

  function closeEditModal() {
    setEditingCustomer(null)
    setEditState(EMPTY_FORM)
    setSaveError(null)
  }

  async function saveEdit() {
    if (!editingCustomer) {
      return
    }

    const validationError = validateCustomerInput(editState)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const data = await apiFetchData<CustomerRecord>(`/api/customers/${editingCustomer.customer_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(editState)),
      })

      refetchCustomers()
      closeEditModal()
    } catch (submitError: unknown) {
      setSaveError(submitError instanceof Error ? submitError.message : "No se pudo guardar el cliente")
    } finally {
      setSaving(false)
    }
  }

  async function changeCustomerActiveState() {
    if (!activeChangeCustomer) {
      return
    }

    setSavingActiveChange(true)
    setSaveError(null)

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
      setActiveChangeCustomer(null)
    } catch (submitError: unknown) {
      setSaveError(submitError instanceof Error ? submitError.message : "No se pudo actualizar el cliente")
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
    { value: "desc", label: "Más reciente" },
    { value: "asc", label: "Más antigua" },
  ]

  const { paginatedItems: paginatedCustomers, totalPages, safePage, firstVisible, lastVisible, setPage } = usePagination(customers)
  const hasActiveFilters = query.trim().length > 0 || docFilter !== "all" || sort !== "desc"

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
          <PosHeader
            eyebrow="Clientes"
            title="Listado de clientes"
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
                  <Link href={`${appRoutes.businessIntelligence}?view=clientes`}>Dashboards BI</Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={refetchCustomers}
                      disabled={loading}
                      aria-label="Actualizar clientes"
                      className="rounded-lg"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    Actualizar
                  </TooltipContent>
                </Tooltip>
                <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                  <Link href="/clientes/nuevo">
                    <Plus className="h-4 w-4" />
                    Nuevo cliente
                  </Link>
                </Button>
              </>
            }
          />

          {saveError ? (
            <InlineStatusCard
              title="No pudimos completar la acción"
              description={saveError}
              tone="danger"
              variant="ops"
            />
          ) : null}

          <OpsSectionDivider>
            <OpsTableBlock>
              <OpsFiltersRow>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Buscar
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
                      placeholder="Nombre, razón social, documento, correo, teléfono o código"
                      className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                    />
                  </div>
                </div>

                <FilterDropdown
                  label="Tipo de documento"
                  value={docFilter}
                  options={docFilterOptions}
                  onChange={(value) => {
                    setDocFilter(value)
                    setPage(1)
                  }}
                />

                <FilterDropdown
                  label="Orden"
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
                      aria-label="Limpiar filtros"
                      className="mt-auto h-10 w-10 rounded-lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    Limpiar filtros
                  </TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              {!loading && !error && customers.length === 0 ? (
                <OpsEmptyState variant="compact" description="No hay clientes registrados todavía." />
              ) : (
                <OpsDataTable
                  columns={[
                    { key: "cliente", header: "Cliente" },
                    { key: "documento", header: "Documento" },
                    { key: "contacto", header: "Contacto" },
                    { key: "tipo", header: "Tipo" },
                    { key: "estado", header: "Estado" },
                    { key: "alta", header: "Alta" },
                    { key: "acciones", header: "", className: "w-[4.5rem] text-right" },
                  ]}
                  minWidth="1080px"
                  loading={loading}
                  loadingMessage="Cargando clientes..."
                  error={error}
                  errorTitle="No pudimos cargar clientes"
                  isEmpty={customers.length > 0 && paginatedCustomers.length === 0}
                  emptyMessage="No hay clientes registrados con este filtro."
                  footer={
                    <>
                      <span className="text-sm text-[var(--ops-text-muted)]">
                        {customers.length === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${customers.length}`}
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
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className="transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {buildDisplayName(customer)}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {customer.internal_code || "Sin código"}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <p className="text-sm text-[var(--ops-text)]">
                          {customer.document_number || "Sin documento"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {DOC_TYPE_LABELS[customer.document_type] || customer.document_type}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <p className="text-sm text-[var(--ops-text)]">{customer.email || "Sin email"}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {customer.phone || "Sin teléfono"}
                        </p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
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
                          ariaLabel={`Acciones para ${buildDisplayName(customer)}`}
                          items={[
                            {
                              label: "Editar",
                              icon: <PencilLine className="h-3.5 w-3.5" />,
                              onSelect: () => openEditModal(customer),
                            },
                            {
                              label: customer.active ? "Inactivar" : "Activar",
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
          <AdminModalShell title="Editar cliente" onClose={closeEditModal} widthClass="max-w-4xl">
              <CustomerForm
                mode="edit"
                state={editState}
                onChange={setEditState}
                onSubmit={saveEdit}
                onCancel={closeEditModal}
                submitLabel="Guardar cambios"
                submitting={saving}
                error={saveError}
              />
          </AdminModalShell>
        ) : null}
        <AdminConfirmModal
          open={Boolean(activeChangeCustomer)}
          title={activeChangeCustomer?.active ? "Inactivar cliente" : "Activar cliente"}
          description={
            activeChangeCustomer ? (
              <>
                Vas a {activeChangeCustomer.active ? "inactivar" : "activar"} a{" "}
                <span className="font-semibold text-[var(--ops-text)]">
                  {buildDisplayName(activeChangeCustomer)}
                </span>
                .
              </>
            ) : null
          }
          confirmLabel={activeChangeCustomer?.active ? "Inactivar" : "Activar"}
          confirmTone={activeChangeCustomer?.active ? "danger" : "accent"}
          busy={savingActiveChange}
          onCancel={() => setActiveChangeCustomer(null)}
          onConfirm={() => void changeCustomerActiveState()}
        />
      </OpsPageShell>
    </TooltipProvider>
  )
}
