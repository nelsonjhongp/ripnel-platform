"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { activeBadgeLabel } from "@/lib/badge-utils";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { PAGE_SIZE } from "@/lib/constants";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminConfirmModal,
  AdminField,
  AdminInput,
  AdminInlineMessage,
  AdminModalShell,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui";
import { OpsSelectMenu } from "@/components/ui/ops-selection";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";

type LocationItem = {
  location_id: string;
  name: string;
  code: string | null;
  type: "store" | "warehouse" | "workshop" | "third_party";
  address: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  type: LocationItem["type"];
  address: string;
  active: boolean;
};

const initialFormState: FormState = {
  name: "",
  type: "store",
  address: "",
  active: true,
};

const locationTypeOptions = [
  { value: "store", label: "Tienda" },
  { value: "warehouse", label: "Almacén" },
  { value: "workshop", label: "Taller" },
  { value: "third_party", label: "Tercero" },
] as const;

const locationTypeLabels: Record<LocationItem["type"], string> = {
  store: "Tienda",
  warehouse: "Almacén",
  workshop: "Taller",
  third_party: "Tercero",
};

export default function LocationsPage() {
  const { data: locationsData, loading, error: loadError, refetch } = useApiGet(
    () => apiFetchData<LocationItem[]>("/api/locations", { cache: "no-store" }),
    []
  );
  const locations = locationsData || [];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LocationItem["type"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [activeChangeLocation, setActiveChangeLocation] = useState<LocationItem | null>(null);
  const [savingActiveChange, setSavingActiveChange] = useState(false);

  const activeCount = locations.filter((location) => location.active).length;
  const storeCount = locations.filter((location) => location.type === "store").length;
  const warehouseCount = locations.filter((location) => location.type === "warehouse").length;

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.active) ||
        (statusFilter === "inactive" && !location.active);
      const matchesType = typeFilter === "all" || location.type === typeFilter;

      if (!matchesStatus || !matchesType) return false;
      if (!normalizedSearch) return true;

      return [location.name, location.code, location.address, locationTypeLabels[location.type]]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [locations, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLocations = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLocations.slice(start, start + PAGE_SIZE);
  }, [filteredLocations, safePage]);

  const firstVisible =
    paginatedLocations.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastVisible = firstVisible + paginatedLocations.length - 1;

  const hasActiveFilters =
    Boolean(search.trim()) || statusFilter !== "all" || typeFilter !== "all";

  function resetForm() {
    setEditingLocationId(null);
    setFormState(initialFormState);
  }

  function openEditModal(location: LocationItem) {
    setEditingLocationId(location.location_id);
    setFormState({
      name: location.name,
      type: location.type,
      address: location.address || "",
      active: location.active,
    });
    setError(null);
    setSuccessMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  async function confirmLocationActiveChange() {
    if (!activeChangeLocation) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSavingActiveChange(true);

    try {
      const data = await apiFetchData<LocationItem>(`/api/locations/${activeChangeLocation.location_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !activeChangeLocation.active }),
      });
      refetch();

      if (editingLocationId === activeChangeLocation.location_id) {
        setFormState((current) => ({ ...current, active: data.active }));
      }

      setSuccessMessage(data.active ? "Ubicación activada." : "Ubicación inactivada.");
      setActiveChangeLocation(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo actualizar la ubicación"
      );
    } finally {
      setSavingActiveChange(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingLocationId);
      const data = await apiFetchData<LocationItem>(
        isEditing ? `/api/locations/${editingLocationId}` : "/api/locations",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? {
                  name: formState.name,
                  address: formState.address.trim() || null,
                  active: formState.active,
                }
              : {
                  name: formState.name,
                  type: formState.type,
                  code: null,
                  address: formState.address.trim() || null,
                  active: formState.active,
                }
          ),
        }
      );

      if (isEditing) {
        refetch();
        setSuccessMessage("Ubicación actualizada.");
      } else {
        refetch();
        setSuccessMessage("Ubicación creada.");
      }

      closeModal();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : editingLocationId
          ? "No se pudo actualizar la ubicación"
          : "No se pudo crear la ubicación"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleTypeFilterChange(value: LocationItem["type"] | "all") {
    setTypeFilter(typeFilter === value ? "all" : value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(value: "active" | "all") {
    setStatusFilter(statusFilter === value ? "all" : value);
    setCurrentPage(1);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
          <PosHeader
            eyebrow="Administración"
            title="Sedes operativas"
            actions={
              <div className="flex items-center gap-2">
                <Button asChild variant="accent" size="sm" className="rounded-lg">
                  <Link href="/administracion/ubicaciones/nuevo">
                    <Plus className="h-3.5 w-3.5" />
                    Nueva sede
                  </Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      onClick={refetch}
                      aria-label="Recargar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Recargar
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <OpsMetricPill
              label="Total sedes"
              value={locations.length}
              active={statusFilter === "all" && typeFilter === "all"}
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setCurrentPage(1); }}
            />
            <OpsMetricPill
              label="Tiendas"
              value={storeCount}
              tone="accent"
              active={typeFilter === "store"}
              onClick={() => { handleTypeFilterChange("store"); }}
            />
            <OpsMetricPill
              label="Almacenes"
              value={warehouseCount}
              tone="accent"
              active={typeFilter === "warehouse"}
              onClick={() => { handleTypeFilterChange("warehouse"); }}
            />
            <OpsMetricPill
              label="Activas"
              value={activeCount}
              tone="success"
              active={statusFilter === "active"}
              onClick={() => { handleStatusFilterChange("active"); }}
            />
          </div>

          <OpsSectionDivider>
            <OpsTableBlock>
            <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.2fr)_0.92fr_auto]">
              <OpsSearchField
                value={search}
                onChange={handleSearchChange}
                placeholder="Buscar por nombre, código o dirección"
                ariaLabel="Buscar ubicaciones"
              />

              <FilterDropdown
                label="Tipo"
                value={typeFilter}
                options={[
                  { value: "all", label: "Todos los tipos" },
                  ...locationTypeOptions.map((o) => ({ value: o.value, label: o.label })),
                ]}
                onChange={(v) => { setTypeFilter(v as "all" | LocationItem["type"]); setCurrentPage(1); }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 rounded-lg"
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Limpiar filtros
                </TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            {loadError || error ? (
              <div role="alert" aria-live="polite" className="rounded-lg border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
                {loadError || error}
              </div>
            ) : null}

            {successMessage ? (
              <div role="status" aria-live="polite" className="rounded-lg border border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#047857_74%,var(--ops-text))]">
                {successMessage}
              </div>
            ) : null}

            {!loading && !loadError && !error && locations.length === 0 ? (
              <OpsEmptyState variant="compact" description="Aún no hay ubicaciones registradas." />
            ) : (
              <OpsDataTable
                columns={[
                  { key: "nombre", header: "Nombre" },
                  { key: "codigo", header: "Código" },
                  { key: "tipo", header: "Tipo" },
                  { key: "direccion", header: "Dirección" },
                  { key: "estado", header: "Estado" },
                  { key: "acciones", header: "", className: "w-10" },
                ]}
                minWidth="820px"
                loading={loading}
                loadingMessage="Cargando ubicaciones..."
                error={loadError || error}
                errorTitle="Error al cargar ubicaciones"
                isEmpty={locations.length > 0 && paginatedLocations.length === 0}
                emptyMessage="No hay resultados para este filtro."
                footer={
                  <>
                    <span className="text-sm tabular-nums text-[var(--ops-text-muted)]">
                      {filteredLocations.length === 0
                        ? "0 resultados"
                        : `${firstVisible}-${lastVisible} de ${filteredLocations.length}`}
                    </span>

                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      className="self-end md:self-auto"
                    />
                  </>
                }
              >
                {paginatedLocations.map((location) => (
                  <tr
                    key={location.location_id}
                    className="transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        {location.name}
                      </p>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ops-text-muted)] tabular-nums">
                        {location.code || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <span className="inline-block rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                        {locationTypeLabels[location.type]}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <span className="text-sm text-[var(--ops-text)]">
                        {location.address || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <OpsStatusBadge tone={location.active ? "success" : "neutral"}>
                        {activeBadgeLabel(location.active)}
                      </OpsStatusBadge>
                    </td>
                    <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)]">
                      <AdminRowActionsMenu
                        ariaLabel={`Acciones para ${location.name}`}
                        items={[
                          {
                            label: "Editar",
                            icon: <PencilLine className="h-3.5 w-3.5" />,
                            onSelect: () => openEditModal(location),
                          },
                          {
                            label: location.active ? "Inactivar" : "Activar",
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

        {showModal ? (
          <AdminModalShell
            title={editingLocationId ? "Editar sede" : "Nueva sede"}
            onClose={closeModal}
            widthClass="max-w-md"
            footer={
              <div className="flex items-center gap-3">
                <AdminActionButton
                  type="button"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancelar
                </AdminActionButton>
                <AdminActionButton
                  type="submit"
                  form="location-edit-form"
                  tone="accent"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Guardando..." : editingLocationId ? "Guardar cambios" : "Crear sede"}
                </AdminActionButton>
              </div>
            }
          >
              <form id="location-edit-form" onSubmit={handleSubmit} className="space-y-5">
                {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
                {successMessage ? <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage> : null}

                <AdminField label="Nombre">
                  <AdminInput
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Tienda Centro"
                    autoComplete="off"
                    required
                  />
                </AdminField>

                <AdminField label="Tipo">
                  <OpsSelectMenu
                    value={formState.type}
                    onValueChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        type: value as LocationItem["type"],
                      }))
                    }
                    placeholder="Selecciona un tipo"
                    options={locationTypeOptions.map((option) => ({ value: option.value, label: option.label }))}
                    disabled={editingLocationId !== null}
                  />
                </AdminField>

                <AdminField label="Dirección">
                  <AdminInput
                    value={formState.address}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Av. Ejemplo 123, Lima"
                    autoComplete="off"
                  />
                </AdminField>

                <AdminField label="Estado">
                  <AdminCheckboxField
                    label="Sede activa"
                    checked={formState.active}
                    onChange={(checked) =>
                      setFormState((current) => ({
                        ...current,
                        active: checked,
                      }))
                    }
                  />
                </AdminField>
              </form>
          </AdminModalShell>
        ) : null}
        <AdminConfirmModal
          open={Boolean(activeChangeLocation)}
          title={activeChangeLocation?.active ? "Inactivar sede" : "Activar sede"}
          description={
            activeChangeLocation ? (
              <>
                Vas a {activeChangeLocation.active ? "inactivar" : "activar"} la sede{" "}
                <span className="font-semibold text-[var(--ops-text)]">
                  {activeChangeLocation.name}
                </span>
                .
              </>
            ) : null
          }
          confirmLabel={activeChangeLocation?.active ? "Inactivar" : "Activar"}
          confirmTone={activeChangeLocation?.active ? "danger" : "accent"}
          busy={savingActiveChange}
          onCancel={() => setActiveChangeLocation(null)}
          onConfirm={() => void confirmLocationActiveChange()}
        />
      </OpsPageShell>
    </TooltipProvider>
  );
}
