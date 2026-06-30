"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Download,
} from "lucide-react";
import { AdminConfirmModal, AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsSelect } from "@/components/ui/ops-selection";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePagination } from "@/hooks/use-pagination";
import { useApiGet } from "@/hooks/use-api-get";
import { fetchCatalogItems, updateCatalogItem } from "@/lib/api-catalogs";
import type { CatalogRecord } from "@/lib/api-catalogs";
import type { CatalogListFieldConfig, CatalogFieldConfig } from "@/lib/product-master-metadata";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { activeBadgeLabel } from "@/lib/badge-utils";
import { showSuccess, showError } from "@/lib/toast";
import { exportToCsv } from "@/lib/export-csv";
import { CUSTOMER_TYPE_PILL } from "./catalogs-constants";
import { CAT } from "./catalogs-messages";
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
  if (typeof value === "boolean") return value ? CAT.crud.yes : CAT.crud.no;
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getItemId(item: CatalogRecord, idKey: string) {
  return String(item[idKey] || "");
}

function buildDisplayName(item: CatalogRecord | null) {
  if (!item) return CAT.crud.fallbackName;
  return String(item.name || item.code || CAT.crud.fallbackName);
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pendingToggleItem, setPendingToggleItem] = useState<CatalogRecord | null>(null);
  const [toggling, setToggling] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  async function handleToggleActive() {
    if (!pendingToggleItem) return;

    setToggling(true);

    try {
      const result = await updateCatalogItem(endpoint, getItemId(pendingToggleItem, idKey), {
        active: !pendingToggleItem.active,
      });
      showSuccess(result.active ? CAT.toast.activated : CAT.toast.deactivated);
      void refetch();
    } catch (requestError) {
      showError(CAT.toast.errorTitle, requestError instanceof Error ? requestError.message : CAT.toast.errorState);
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
      await updateCatalogItem(endpoint, getItemId(editingItem, idKey), body);
      showSuccess(CAT.toast.updated);
      setEditingItem(null);
      void refetch();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : CAT.toast.errorSave;
      setEditError(message);
      showError(CAT.toast.saveErrorTitle, message);
    } finally {
      setEditSubmitting(false);
    }
  }

  const readOnlyFieldKeys = fields
    .filter((field) => field.editableOnUpdate === false)
    .map((field) => field.key);

  function handleExport() {
    const csvHeaders = [CAT.crud.csvCode, CAT.crud.csvName, ...listFields.map((f) => f.label), CAT.crud.csvActive];
    const csvRows = items.map((item) => [
      (item as Record<string, unknown>).code ? String((item as Record<string, unknown>).code) : "-",
      String((item as Record<string, unknown>).name || "-"),
      ...listFields.map((f) => formatValue((item as Record<string, unknown>)[f.key])),
      item.active ? CAT.crud.yes : CAT.crud.no,
    ]);
    exportToCsv(entityLabel.toLowerCase(), csvHeaders, csvRows);
  }

  return (
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
                  aria-label={CAT.crud.exportCsv}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {CAT.crud.exportCsv}
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
                  aria-label={CAT.crud.refresh}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {CAT.crud.refresh}
              </TooltipContent>
            </Tooltip>
            <Button asChild variant="accent" size="sm" className="rounded-lg">
              <Link href={`${catalogRoute}/nuevo`}>
                <Plus className="h-4 w-4" />
                {CAT.crud.newRecord}
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
              placeholder={CAT.crud.searchPlaceholder}
              ariaLabel={CAT.crud.searchAria}
            />

            <OpsSelect
              label={CAT.crud.statusLabel}
              value={statusFilter}
              options={[
                { value: "all", label: CAT.crud.statusAll },
                { value: "active", label: CAT.crud.statusActive },
                { value: "inactive", label: CAT.crud.statusInactive },
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
                  aria-label={CAT.crud.clearFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {CAT.crud.clearFilters}
              </TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          {error ? (
            <p className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--ops-tone-danger-text)]">
              {error}
            </p>
          ) : null}

          <OpsTableWrap minWidth="920px">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">{CAT.crud.columnRecord}</th>
                  {listFields.map((field) => (
                    <th key={field.key} className="px-4 py-3">{field.label}</th>
                  ))}
                  <th className="px-4 py-3">{CAT.crud.columnStatus}</th>
                  <th className="w-[3.5rem] px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loading ? (
                  <tr>
                    <td colSpan={listFields.length + 3} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                      {CAT.crud.loading}
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
                              <span className={CUSTOMER_TYPE_PILL}>
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
                          ariaLabel={CAT.crud.actionsAria(buildDisplayName(item))}
                          items={[
                            {
                              label: CAT.crud.edit,
                              icon: <PencilLine className="h-3.5 w-3.5" />,
                              onSelect: () => openEdit(item),
                            },
                            {
                              label: item.active ? CAT.crud.inactivate : CAT.crud.activate,
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
                    <td colSpan={listFields.length + 3}>
                      <OpsEmptyState
                        variant="compact"
                        description={items.length ? CAT.crud.noResults : emptyDescription}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </OpsTableWrap>

          <OpsTableFooter>
            <span className="text-sm text-[var(--ops-text-muted)]">
              {filteredItems.length ? `${firstVisible}-${lastVisible} de ${filteredItems.length}` : CAT.crud.zeroResults}
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
        title={pendingToggleItem?.active ? CAT.crud.inactivateTitle(entityLabel) : CAT.crud.activateTitle(entityLabel)}
        description={
          <>
            {CAT.crud.toggleDescription(
              pendingToggleItem?.active ? CAT.crud.inactivate.toLowerCase() : CAT.crud.activate.toLowerCase(),
              buildDisplayName(pendingToggleItem)
            )}
            {pendingToggleItem?.code ? (
              <>
                {" "}
                <span className="text-[var(--ops-text-muted)]">({pendingToggleItem.code})</span>
              </>
            ) : null}
          </>
        }
        confirmLabel={pendingToggleItem?.active ? CAT.crud.inactivate : CAT.crud.activate}
        confirmTone={pendingToggleItem?.active ? "danger" : "accent"}
        busy={toggling}
        onCancel={() => setPendingToggleItem(null)}
        onConfirm={() => void handleToggleActive()}
      />

      <OpsDialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => { if (!open) closeEdit(); }}
        title={editingItem ? CAT.crud.editTitle(buildDisplayName(editingItem)) : CAT.crud.createTitle}
        description={editingItem ? CAT.crud.editDescription(buildDisplayName(editingItem)) : CAT.crud.createDescription}
        size="lg"
      >
        {editingItem ? (
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
            onSubmit={handleEditSubmit}
            onCancel={closeEdit}
          />
        ) : null}
      </OpsDialog>
    </OpsPageShell>
  );
}
