"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
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
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell"
import { Pagination } from "@/components/ui/pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch, buildApiUrl, unwrapApiData } from "@/lib/api"
import { appRoutes } from "@/lib/routes"

const PAGE_SIZE = 10

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [docFilter, setDocFilter] = useState("all")
  const [sort, setSort] = useState<"desc" | "asc">("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)
  const [editState, setEditState] = useState<CustomerFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeChangeCustomer, setActiveChangeCustomer] = useState<CustomerRecord | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  async function fetchCustomers(nextQuery: string, nextDocFilter: string, nextSort: "desc" | "asc") {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const normalizedQuery = nextQuery.trim()

      if (normalizedQuery) {
        params.set("q", normalizedQuery)
      }

      if (nextDocFilter !== "all") {
        params.set("document_type", nextDocFilter)
      }
      params.set("sort", nextSort)

      const payload = await apiFetch<{ ok: boolean; data: CustomerRecord[] } | CustomerRecord[]>(
        `/api/customers?${params.toString()}`,
        {
          signal: controller.signal,
          cache: "no-store",
        }
      )

      const nextCustomers = unwrapApiData<CustomerRecord[]>(payload)
      setCustomers(Array.isArray(nextCustomers) ? nextCustomers : [])
    } catch (loadError: unknown) {
      if (loadError instanceof Error && loadError.name === "AbortError") {
        return
      }

      setCustomers([])
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los clientes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCustomers(query, docFilter, sort)
    }, 180)

    return () => {
      window.clearTimeout(timer)
    }
  }, [docFilter, query, sort])

  function clearFilters() {
    setQuery("")
    setDocFilter("all")
    setSort("desc")
    setCurrentPage(1)
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
      const response = await fetch(buildApiUrl(`/api/customers/${editingCustomer.customer_id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(editState)),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo guardar el cliente")
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.customer_id === editingCustomer.customer_id ? payload.data : customer
        )
      )
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
      const response = await fetch(buildApiUrl(`/api/customers/${activeChangeCustomer.customer_id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !activeChangeCustomer.active }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el cliente")
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.customer_id === activeChangeCustomer.customer_id ? payload.data : customer
        )
      )
      if (editingCustomer?.customer_id === activeChangeCustomer.customer_id) {
        setEditingCustomer(payload.data)
        setEditState(toFormState(payload.data))
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

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return customers.slice(start, start + PAGE_SIZE)
  }, [customers, safeCurrentPage])
  const firstVisible = paginatedCustomers.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1
  const lastVisible = paginatedCustomers.length === 0 ? 0 : firstVisible + paginatedCustomers.length - 1
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
                      onClick={() => fetchCustomers(query, docFilter, sort)}
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
                        setCurrentPage(1)
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
                    setCurrentPage(1)
                  }}
                />

                <FilterDropdown
                  label="Orden"
                  value={sort}
                  options={sortOptions}
                  onChange={(v) => {
                    setSort(v as "desc" | "asc")
                    setCurrentPage(1)
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

              <OpsTableWrap minWidth="1080px">
                  <table className="w-full border-collapse">
                    <thead className="bg-[var(--ops-surface-muted)]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Contacto</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Alta</th>
                        <th className="w-[4.5rem] px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                            Cargando clientes...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6">
                            <InlineStatusCard
                              title="No pudimos cargar clientes"
                              description={error}
                              tone="danger"
                              variant="ops"
                            />
                          </td>
                        </tr>
                      ) : paginatedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                            No hay clientes registrados con este filtro.
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomers.map((customer) => (
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
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                  customer.active
                                    ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
                                    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                                }`}
                              >
                                {customer.active ? "Activo" : "Inactivo"}
                              </span>
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
                        ))
                      )}
                    </tbody>
                  </table>
              </OpsTableWrap>

              <OpsTableFooter>
                <span className="text-sm text-[var(--ops-text-muted)]">
                  {customers.length === 0 ? "0 resultados" : `${firstVisible}-${lastVisible} de ${customers.length}`}
                </span>
                <Pagination
                  page={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="self-end md:self-auto"
                />
              </OpsTableFooter>
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
