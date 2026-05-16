"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { AdminConfirmModal, AdminInlineMessage, AdminModalShell, AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchCatalogItems, updateCatalogItem } from "@/lib/api-catalogs";
import type { CatalogRecord } from "@/lib/api-catalogs";
import type { CatalogListFieldConfig, CatalogFieldConfig } from "@/lib/product-master-metadata";
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

const PAGE_SIZE = 10;

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
  const [items, setItems] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pendingToggleItem, setPendingToggleItem] = useState<CatalogRecord | null>(null);
  const [toggling, setToggling] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await fetchCatalogItems(endpoint));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el catalogo"
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadItems();
    });
  }, [loadItems]);

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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleFrom = filteredItems.length ? pageStart + 1 : 0;
  const visibleTo = filteredItems.length
    ? Math.min(pageStart + PAGE_SIZE, filteredItems.length)
    : 0;
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  function updateItemInList(nextItem: CatalogRecord) {
    setItems((current) =>
      current.map((item) =>
        getItemId(item, idKey) === getItemId(nextItem, idKey) ? nextItem : item
      )
    );
  }

  async function handleToggleActive() {
    if (!pendingToggleItem) return;

    setToggling(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateCatalogItem(endpoint, getItemId(pendingToggleItem, idKey), {
        active: !pendingToggleItem.active,
      });
      updateItemInList(result);
      setSuccessMessage(
        result.active ? "Registro activado correctamente." : "Registro inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado"
      );
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
      updateItemInList(result);
      setSuccessMessage("Registro actualizado correctamente.");
      setEditingItem(null);
    } catch (requestError) {
      setEditError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el registro"
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  const readOnlyFieldKeys = fields
    .filter((field) => field.editableOnUpdate === false)
    .map((field) => field.key);

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
                    onClick={loadItems}
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

              <FilterDropdown
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

            {error ? (
              <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
            ) : null}

            {successMessage ? (
              <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
            ) : null}

            <OpsTableWrap minWidth="920px">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Registro</th>
                    {listFields.map((field) => (
                      <th key={field.key} className="px-4 py-3">{field.label}</th>
                    ))}
                    <th className="px-4 py-3">Estado</th>
                    <th className="w-[3.5rem] px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={listFields.length + 3} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                        Cargando registros...
                      </td>
                    </tr>
                  ) : filteredItems.length ? (
                    paginatedItems.map((item, index) => (
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
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              item.active
                                ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
                                : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </span>
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={listFields.length + 3} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        {items.length
                          ? "No hay resultados para este filtro."
                          : emptyDescription}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </OpsTableWrap>

            <OpsTableFooter>
              <span className="text-sm text-[var(--ops-text-muted)]">
                {filteredItems.length ? `${visibleFrom}-${visibleTo} de ${filteredItems.length}` : "0 resultados"}
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                className="self-end md:self-auto"
              />
            </OpsTableFooter>
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
