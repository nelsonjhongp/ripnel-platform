"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { apiFetchData } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"
import { activeBadgeLabel } from "@/lib/badge-utils"
import { showSuccess, showError } from "@/lib/toast"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { usePagination } from "@/hooks/use-pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import {
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { Pagination } from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { opsInputCompact, INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"

import {
  type Location,
  type LocationFormState,
  type LocationFormErrors,
  EMPTY_LOCATION_FORM,
  LOCATION_TYPE_OPTIONS,
} from "./admin-types"
import { ADMIN } from "./admin-messages"
import { LOCATION_TYPE_LABELS } from "./admin-constants"
import {
  validateLocationInput,
  buildLocationCreatePayload,
  buildLocationEditPayload,
  toLocationFormState,
  mapLocationSaveError,
} from "./admin-utils"

type ActionState = "idle" | "validating" | "saving"

export default function LocationsPage() {
  const { data: locationsData, loading, error: loadError, refetch } = useApiGet(
    () => apiFetchData<Location[]>("/api/locations", { cache: "no-store" }),
    [],
  )
  const locations = locationsData || []

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | Location["type"]>("all")

  const [showModal, setShowModal] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [formState, setFormState] = useState<LocationFormState>(EMPTY_LOCATION_FORM)
  const [formErrors, setFormErrors] = useState<LocationFormErrors | null>(null)
  const [actionState, setActionState] = useState<ActionState>("idle")

  const [activeChangeLocation, setActiveChangeLocation] = useState<Location | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  const isEdit = Boolean(editingLocationId)
  const isBusy = actionState !== "idle"

  useEffect(() => {
    if (showModal) {
      void Promise.resolve().then(() => {
        setFormErrors(null)
        setActionState("idle")
      })
    }
  }, [showModal])

  const activeCount = locations.filter((l) => l.active).length
  const storeCount = locations.filter((l) => l.type === "store").length
  const warehouseCount = locations.filter((l) => l.type === "warehouse").length

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.active) ||
        (statusFilter === "inactive" && !location.active)
      const matchesType = typeFilter === "all" || location.type === typeFilter
      if (!matchesStatus || !matchesType) return false
      if (!normalizedSearch) return true
      return [location.name, location.code, location.address, LOCATION_TYPE_LABELS[location.type]]
        .filter((v) => v !== null && v !== undefined)
        .some((v) => String(v).toLowerCase().includes(normalizedSearch))
    })
  }, [locations, search, statusFilter, typeFilter])

  const { paginatedItems: paginatedLocations, totalPages, safePage, firstVisible, lastVisible, setPage } =
    usePagination(filteredLocations)

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all" || typeFilter !== "all"

  function openCreateModal() {
    setEditingLocationId(null)
    setFormState(EMPTY_LOCATION_FORM)
    setFormErrors(null)
    setActionState("idle")
    setShowModal(true)
  }

  function openEditModal(location: Location) {
    setEditingLocationId(location.location_id)
    setFormState(toLocationFormState(location))
    setFormErrors(null)
    setActionState("idle")
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingLocationId(null)
    setFormState(EMPTY_LOCATION_FORM)
    setFormErrors(null)
    setActionState("idle")
  }

  async function saveLocation() {
    setActionState("validating")
    setFormErrors(null)

    const validation = validateLocationInput(formState, isEdit)
    if (validation) {
      setFormErrors(validation)
      setActionState("idle")
      return
    }

    try {
      setActionState("saving")
      if (editingLocationId) {
        await apiFetchData<Location>(`/api/locations/${editingLocationId}`, {
          method: "PATCH",
          body: JSON.stringify(buildLocationEditPayload(formState)),
        })
        showSuccess(ADMIN.toast.locationUpdated)
      } else {
        await apiFetchData<Location>("/api/locations", {
          method: "POST",
          body: JSON.stringify(buildLocationCreatePayload(formState)),
        })
        showSuccess(ADMIN.toast.locationCreated)
      }
      closeModal()
      refetch()
    } catch (error) {
      const mapped = mapLocationSaveError(error)
      setFormErrors(mapped)
      if (mapped._form) {
        showError(ADMIN.toast.locationSaveError, mapped._form)
      }
    } finally {
      setActionState("idle")
    }
  }

  async function confirmLocationActiveChange() {
    if (!activeChangeLocation) return

    setSavingActiveChange(true)
    try {
      await apiFetchData<Location>(`/api/locations/${activeChangeLocation.location_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !activeChangeLocation.active }),
      })
      showSuccess(activeChangeLocation.active ? ADMIN.toast.locationDeactivated : ADMIN.toast.locationActivated)
      setActiveChangeLocation(null)
      refetch()
    } catch (error) {
      showError(ADMIN.toast.locationSaveError, error instanceof Error ? error.message : "")
    } finally {
      setSavingActiveChange(false)
    }
  }

  function clearFilters() {
    setSearch("")
    setStatusFilter("all")
    setTypeFilter("all")
    setPage(1)
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={ADMIN.header.locationsEyebrow}
        title={ADMIN.header.locationsTitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg"
              onClick={openCreateModal}
            >
              <Plus className="h-3.5 w-3.5" />
              {ADMIN.actions.newLocation}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={refetch}
                  aria-label={ADMIN.actions.refreshLocations}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {ADMIN.actions.refreshLocations}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: ADMIN.metrics.total, value: locations.length },
          { label: ADMIN.metrics.stores, value: storeCount, tone: "accent" },
          { label: ADMIN.metrics.warehouses, value: warehouseCount, tone: "accent" },
          { label: ADMIN.metrics.activeLocations, value: activeCount, tone: "success" },
        ]}
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.2fr)_0.92fr_0.92fr_auto]">
            <OpsSearchField
              value={search}
              onChange={(value) => { setSearch(value); setPage(1) }}
              placeholder={ADMIN.filters.searchLocations}
              ariaLabel={ADMIN.filters.searchLocationsAria}
            />
            <OpsSelect
              label={ADMIN.filters.typeLabel}
              value={typeFilter}
              options={[
                { value: "all", label: ADMIN.filters.allTypes },
                ...LOCATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
              onChange={(v) => { setTypeFilter(v as "all" | Location["type"]); setPage(1) }}
            />
            <OpsSelect
              label={ADMIN.filters.statusLabel}
              value={statusFilter}
              options={[
                { value: "all", label: ADMIN.filters.allStatuses },
                { value: "active", label: ADMIN.filters.activeOnly },
                { value: "inactive", label: ADMIN.filters.inactiveOnly },
              ]}
              onChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1) }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  variant="outline"
                  size="icon-sm"
                  className="mt-auto h-10 w-10 rounded-lg"
                  aria-label={ADMIN.filters.clear}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {ADMIN.filters.clear}
              </TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          {loadError ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
              {loadError}
            </div>
          ) : null}

          {!loading && !loadError && locations.length === 0 ? (
            <OpsEmptyState variant="compact" description={ADMIN.table.locations.noLocations} />
          ) : (
            <OpsDataTable
              columns={[
                { key: "nombre", header: ADMIN.table.locations.columns.nombre },
                { key: "codigo", header: ADMIN.table.locations.columns.codigo },
                { key: "tipo", header: ADMIN.table.locations.columns.tipo },
                { key: "direccion", header: ADMIN.table.locations.columns.direccion },
                { key: "estado", header: ADMIN.table.locations.columns.estado },
                { key: "acciones", header: ADMIN.table.locations.columns.acciones, className: "w-10" },
              ]}
              minWidth="820px"
              loading={loading}
              loadingMessage={ADMIN.table.locations.loadingM}
              error={loadError}
              errorTitle={ADMIN.table.locations.errorTitle}
              isEmpty={locations.length > 0 && paginatedLocations.length === 0}
              emptyMessage={ADMIN.table.locations.empty}
              footer={
                <>
                  <span className="text-sm tabular-nums text-[var(--ops-text-muted)]">
                    {filteredLocations.length === 0
                      ? ADMIN.table.locations.zeroResults
                      : `${firstVisible}-${lastVisible} de ${filteredLocations.length}`}
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
              {paginatedLocations.map((location) => (
                <tr key={location.location_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {location.name}
                    </p>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ops-text-muted)] tabular-nums">
                      {location.code || ADMIN.fallback.dash}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <span className="inline-block rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                      {LOCATION_TYPE_LABELS[location.type]}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <span className="text-sm text-[var(--ops-text)]">
                      {location.address || ADMIN.fallback.dash}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <OpsStatusBadge tone={location.active ? "success" : "neutral"}>
                      {activeBadgeLabel(location.active)}
                    </OpsStatusBadge>
                  </td>
                  <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)]">
                    <AdminRowActionsMenu
                      ariaLabel={ADMIN.actions.actionsFor(location.name)}
                      items={[
                        {
                          label: ADMIN.actions.edit,
                          icon: <PencilLine className="h-3.5 w-3.5" />,
                          onSelect: () => openEditModal(location),
                        },
                        {
                          label: location.active ? ADMIN.actions.inactivate : ADMIN.actions.activate,
                          icon: <Power className="h-3.5 w-3.5" />,
                          tone: location.active ? "danger" : "neutral",
                          onSelect: () => setActiveChangeLocation(location),
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

      <OpsDialog
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={isEdit ? ADMIN.dialog.locationEditTitle : ADMIN.dialog.locationCreateTitle}
        description={isEdit ? ADMIN.dialog.locationEditDesc : ADMIN.dialog.locationCreateDesc}
        size="sm"
        bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={closeModal}
              disabled={isBusy}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void saveLocation()}
              disabled={isBusy}
            >
              {actionState === "validating" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.validating}
                </span>
              ) : actionState === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.saving}
                </span>
              ) : (
                isEdit ? ADMIN.dialog.saveLocationEdit : ADMIN.dialog.saveLocation
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formErrors?._form ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
              {formErrors._form}
            </div>
          ) : null}

          <OpsFormField label={ADMIN.form.name} required error={formErrors?.name} density="compact">
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((c) => ({ ...c, name: e.target.value }))}
              placeholder={ADMIN.form.namePlaceholder}
              autoComplete="off"
              required
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField
            label={ADMIN.form.type}
            required
            error={formErrors?.type}
            hint={isEdit ? ADMIN.form.typeDisabledHint : undefined}
            density="compact"
          >
            <OpsSelect
              value={formState.type}
              onValueChange={(value) =>
                setFormState((c) => ({ ...c, type: value as LocationFormState["type"] }))
              }
              placeholder={ADMIN.form.typePlaceholder}
              options={LOCATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              disabled={isEdit}
            />
          </OpsFormField>

          <OpsFormField label={ADMIN.form.address} density="compact">
            <input
              type="text"
              value={formState.address}
              onChange={(e) => setFormState((c) => ({ ...c, address: e.target.value }))}
              placeholder={ADMIN.form.addressPlaceholder}
              autoComplete="off"
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField label={ADMIN.form.state} density="compact">
            <label className="inline-flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={(e) => setFormState((c) => ({ ...c, active: e.target.checked }))}
                className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
              />
              <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">
                {ADMIN.form.locationActiveLabel}
              </span>
            </label>
          </OpsFormField>
        </div>
      </OpsDialog>

      <OpsDialog
        open={Boolean(activeChangeLocation)}
        onOpenChange={(open) => { if (!open) setActiveChangeLocation(null) }}
        title={activeChangeLocation?.active ? ADMIN.dialog.locationActiveTitle : ADMIN.dialog.locationInactiveTitle}
        description={
          activeChangeLocation
            ? ADMIN.dialog.locationActiveDesc(activeChangeLocation.name, activeChangeLocation.active)
            : undefined
        }
        size="sm"
        bodyClassName="px-5 py-5"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setActiveChangeLocation(null)}
              disabled={savingActiveChange}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant={activeChangeLocation?.active ? "destructive" : "accent"}
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void confirmLocationActiveChange()}
              disabled={savingActiveChange}
            >
              {savingActiveChange ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.processing}
                </span>
              ) : activeChangeLocation?.active ? (
                ADMIN.dialog.confirmInactivate
              ) : (
                ADMIN.dialog.confirmActivate
              )}
            </Button>
          </div>
        }
      >{null}</OpsDialog>
    </OpsPageShell>
  )
}
