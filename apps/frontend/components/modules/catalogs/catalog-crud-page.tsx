"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Download,
} from "lucide-react";
import { AdminConfirmModal, AdminInlineMessage, AdminModalShell, AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { OpsSelect } from "@/components/ui/ops-selection";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePagination } from "@/hooks/use-pagination";
import { useApiGet } from "@/hooks/use-api-get";
import { fetchCatalogItems, updateCatalogItem } from "@/lib/api-catalogs";
import type { CatalogRecord } from "@/lib/api-catalogs";
import type { CatalogListFieldConfig, CatalogFieldConfig } from "@/lib/product-master-metadata";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { activeBadgeLabel } from "@/lib/badge-utils";
import { showSuccess, showError } from "@/lib/toast";
import { exportToCsv } from "@/lib/export-csv";
import { CatalogItemForm, buildInitialState } from "./catalog-item-form";

type CatalogCrudPageProps = {
  eyebrow: string;
  title: string;
  endpoint: string;
  emptyTitle: string;
  emptyDescription: string;
  listFields: CatalogListFieldConfig[];
  fields: CatalogFieldConfig[];
  idKey: string;
  catalogRoute: string;
  entityLabel: string;
  duplicateStrategy: "name" | "name+code";
};

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getItemId(item: CatalogRecord, idKey: string) {
  return String(item[idKey] || "");
}

function buildDisplayName(item: CatalogRecord | null) {
  if (!item) return "registro";
  return String(item.name || item.code || "registro");
}

function toInitialValues(item: CatalogRecord, fields: CatalogFieldConfig[]) {
  const state = buildInitialState(fields);
  for (const field of fields) {
    state[field.key] =
      item[field.key] === null || item[field.key] === undefined
        ? ""
        : String(item[field.key]);
  }
  state.active = Boolean(item.active);
  return state;
}

export function CatalogCrudPage({
  eyebrow,
  title,
  endpoint,
  emptyDescription,
  listFields,
  fields,
  idKey,
  catalogRoute,
  entityLabel,
  duplicateStrategy,
}: CatalogCrudPageProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingToggleItem, setPendingToggleItem] = useState<CatalogRecord | null>(null);
  const [toggling, setToggling] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiGet(
    () => fetchCatalogItems(endpoint),
    [endpoint]
  );
  const items = data ?? [];

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.active) ||
        (statusFilter === "inactive" && !item.active);

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      return [item.name, item.code, ...listFields.map((field) => item[field.key])]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [items, listFields, search, statusFilter]);

  const { paginatedItems, totalPages, safePage, firstVisible, lastVisible, setPage } =
    usePagination(filteredItems);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  const columns = useMemo(() => [
    { key: "registro", header: "Registro" },
    ...listFields.map((f) => ({ key: f.key, header: f.label })),
    { key: "estado", header: "Estado" },
    { key: "actions", header: "", className: "w-[3.5rem]" },
  ], [listFields]);

  async function handleToggleActive() {
    if (!pendingToggleItem) return;

    setToggling(true);
    setMutationError(null);
    setSuccessMessage(null);

    try {
      const result = await updateCatalogItem(endpoint, getItemId(pendingToggleItem, idKey), {
        active: !pendingToggleItem.active,
      });
      setSuccessMessage(
        result.active ? "Registro activado correctamente." : "Registro inactivado correctamente."
      );
      showSuccess(result.active ? "Registro activado" : "Registro inactivado")
      void refetch();
    } catch (requestError) {
      setMutationError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado"
      );
      showError("Error", requestError instanceof Error ? requestError.message : "No se pudo actualizar el estado")
    } finally {
      setToggling(false);
      setPendingToggleItem(null);
    }
  }

  function openEdit(item: CatalogRecord) {
    setEditingItem(item);
    setEditError(null);
  }

  function closeEdit() {
    setEditingItem(null);
    setEditError(null);
  }

  async function handleEditSubmit(body: Record<string, unknown>) {
    if (!editingItem) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const result = await updateCatalogItem(endpoint, getItemId(editingItem, idKey), body);
      setSuccessMessage("Registro actualizado correctamente.");
      showSuccess("Actualizado", "Registro actualizado correctamente.")
      setEditingItem(null);
      void refetch();
    } catch (requestError) {
      setEditError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el registro"
      );
      showError("Error al guardar", requestError instanceof Error ? requestError.message : "No se pudo actualizar el registro")
    } finally {
      setEditSubmitting(false);
    }
  }

  const readOnlyFieldKeys = fields
    .filter((field) => field.editableOnUpdate === false)
    .map((field) => field.key);

  function handleExport() {
    const csvHeaders = ["Código", "Nombre", ...listFields.map((f) => f.label), "Activo"]
    const csvRows = items.map((item) => [
      (item as Record<string, unknown>).code ? String((item as Record<string, unknown>).code) : "-",
      String((item as Record<string, unknown>).name || "-"),
      ...listFields.map((f) => formatValue((item as Record<string, unknown>)[f.key])),
      item.active ? "Sí" : "No",
    ])
    exportToCsv(entityLabel.toLowerCase(), csvHeaders, csvRows)
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow={eyebrow}
          title={title}
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
                    disabled={items.length === 0}
                    aria-label="Exportar CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Exportar CSV
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                     className="rounded-lg"
                     onClick={() => refetch()}
                     disabled={loading}
                    aria-label="Actualizar"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Actualizar
                </TooltipContent>
              </Tooltip>
              <Button asChild variant="accent" size="sm" className="rounded-lg">
                <Link href={`${catalogRoute}/nuevo`}>
                  <Plus className="h-4 w-4" />
                  Nuevo registro
                </Link>
              </Button>
            </>
          }
        />

        <OpsSectionDivider>
          <OpsTableBlock>
            <OpsFiltersRow className="lg:grid-cols-[1.45fr_0.84fr_auto]">
              <OpsSearchField
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre, codigo o detalle"
                ariaLabel="Buscar registros"
              />

              <OpsSelect
                label="Estado"
                value={statusFilter}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "active", label: "Activos" },
                  { value: "inactive", label: "Inactivos" },
                ]}
                onChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1); }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 rounded-lg"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                    disabled={!hasActiveFilters}
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Limpiar filtros
                </TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            {mutationError ? (
              <AdminInlineMessage tone="danger">{mutationError}</AdminInlineMessage>
            ) : null}

            {successMessage ? (
              <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
            ) : null}

            <OpsDataTable
              columns={columns}
              loading={loading}
              error={error}
              emptyMessage={items.length ? "No hay resultados para este filtro." : emptyDescription}
              isEmpty={!loading && !error && filteredItems.length === 0}
              footer={
                <>
                  <span className="text-sm text-[var(--ops-text-muted)]">
                    {filteredItems.length ? `${firstVisible}-${lastVisible} de ${filteredItems.length}` : "0 resultados"}
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
              {paginatedItems.map((item, index) => (
                <tr
                  key={String(item.code || item.name || index)}
                  className={`transition hover:bg-[var(--ops-surface-muted)] ${!item.active ? "opacity-80" : ""}`}
                >
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {formatValue(item.name)}
                        </p>
                        {"code" in item && item.code ? (
                          <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                            {String(item.code)}
                          </span>
                        ) : null}
                      </div>
                      {item.created_at ? (
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          {new Date(String(item.created_at)).toLocaleDateString("es-PE")}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  {listFields.map((field) => (
                    <td key={field.key} className="px-4 py-[var(--ops-row-py)]">
                      {field.render === "hex" ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-4 w-4 shrink-0 rounded-[4px] border border-[color:var(--ops-border-strong)]"
                            style={{
                              backgroundColor: String(item[field.key] || "transparent"),
                            }}
                            aria-hidden="true"
                          />
                          <span className="truncate text-sm text-[var(--ops-text)]">
                            {formatValue(item[field.key])}
                          </span>
                        </div>
                      ) : (
                        <p className="truncate text-sm text-[var(--ops-text)]">
                          {formatValue(item[field.key])}
                        </p>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <OpsStatusBadge tone={item.active ? "success" : "neutral"}>
                      {activeBadgeLabel(!!item.active)}
                    </OpsStatusBadge>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <AdminRowActionsMenu
                      ariaLabel={`Acciones para ${buildDisplayName(item)}`}
                      items={[
                        {
                          label: "Editar",
                          icon: <PencilLine className="h-3.5 w-3.5" />,
                          onSelect: () => openEdit(item),
                        },
                        {
                          label: item.active ? "Inactivar" : "Activar",
                          icon: <Power className="h-3.5 w-3.5" />,
                          tone: item.active ? "danger" : "neutral",
                          onSelect: () => setPendingToggleItem(item),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </OpsDataTable>
          </OpsTableBlock>
        </OpsSectionDivider>

        <AdminConfirmModal
          open={Boolean(pendingToggleItem)}
          title={pendingToggleItem?.active ? `Inactivar ${entityLabel}` : `Activar ${entityLabel}`}
          description={
            <>
              Vas a {pendingToggleItem?.active ? "inactivar" : "activar"} a{" "}
              <span className="font-semibold text-[var(--ops-text)]">
                {buildDisplayName(pendingToggleItem)}
              </span>
              {pendingToggleItem?.code ? (
                <>
                  {" "}
                  <span className="text-[var(--ops-text-muted)]">({pendingToggleItem.code})</span>
                </>
              ) : null}
              .
            </>
          }
          confirmLabel={pendingToggleItem?.active ? "Inactivar" : "Activar"}
          confirmTone={pendingToggleItem?.active ? "danger" : "accent"}
          busy={toggling}
          onCancel={() => setPendingToggleItem(null)}
          onConfirm={() => void handleToggleActive()}
        />

        {editingItem ? (
          <AdminModalShell
            title={`Editar ${buildDisplayName(editingItem)}`}
            onClose={closeEdit}
            widthClass="max-w-2xl"
          >
            <CatalogItemForm
              catalogItems={items.filter(
                (item) => getItemId(item, idKey) !== getItemId(editingItem, idKey)
              )}
              fields={fields}
              idKey={idKey}
              duplicateStrategy={duplicateStrategy}
              mode="edit"
              initialValues={toInitialValues(editingItem, fields)}
              readOnlyFieldKeys={readOnlyFieldKeys}
              submitting={editSubmitting}
              error={editError}
              successMessage={null}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
            />
          </AdminModalShell>
        ) : null}
      </OpsPageShell>
    </TooltipProvider>
  );
}
