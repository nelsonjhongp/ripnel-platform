"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Shapes,
} from "lucide-react";
import { AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { apiFetchData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpsReadonlyFieldState, OpsSelect } from "@/components/ui/ops-selection";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { ProductCreateDialog } from "./product-create-dialog";
import { PRODUCTS } from "./products-messages";
import { opsInputCompact } from "./products-constants";
import { PRODUCT_DESCRIPTION_MAX_LENGTH } from "./products-utils";
import type { CatalogItem, StatusFilter } from "@/types/products";
import { showSuccess, showError } from "@/lib/toast";

type StyleItem = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_id: string;
  garment_type_name: string;
  size_codes: string[];
  color_codes: string[];
};

type FormState = {
  name: string;
  description: string;
  active: boolean;
};

const STATUS_OPTIONS = [
  { value: "all", label: PRODUCTS.styles.filters.statusOptions.all },
  { value: "active", label: PRODUCTS.styles.filters.statusOptions.active },
  { value: "inactive", label: PRODUCTS.styles.filters.statusOptions.inactive },
] as const;

const initialFormState: FormState = {
  name: "",
  description: "",
  active: true,
};

async function requestApiData<T>(path: string) {
  return apiFetchData<T>(path, {
    cache: "no-store",
  });
}

async function requestStylesModuleData() {
  const [stylesData, garmentTypesData] = await Promise.all([
    requestApiData<StyleItem[]>("/api/styles"),
    requestApiData<CatalogItem[]>("/api/garment-types"),
  ]);

  return {
    stylesData,
    garmentTypesData,
  };
}

export function StylesPage({
  initialStyleId = null,
}: {
  initialStyleId?: string | null;
}) {
  const router = useRouter();
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [garmentTypes, setGarmentTypes] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingStatusStyle, setPendingStatusStyle] = useState<StyleItem | null>(null);
  const [togglingStyleId, setTogglingStyleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [actionState, setActionState] = useState<"idle" | "validating" | "saving">("idle");
  const hasAppliedInitialSelection = useRef(false);

  const isBusy = actionState !== "idle";

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { stylesData, garmentTypesData } = await requestStylesModuleData();
      setStyles(stylesData);
      setGarmentTypes(garmentTypesData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : PRODUCTS.styles.loadError
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  useEffect(() => {
    if (
      hasAppliedInitialSelection.current ||
      !initialStyleId ||
      editingStyleId === initialStyleId ||
      !styles.length
    ) {
      return;
    }

    const matchedStyle = styles.find((style) => style.style_id === initialStyleId);

    if (matchedStyle) {
      hasAppliedInitialSelection.current = true;
      handleEdit(matchedStyle);
    }
  }, [editingStyleId, initialStyleId, styles]);

  const activeCount = styles.filter((style) => style.active).length;
  const inactiveCount = styles.length - activeCount;

  const filteredStyles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return styles.filter((style) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && style.active) ||
        (statusFilter === "inactive" && !style.active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [style.name, style.style_code, style.garment_type_name]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [search, statusFilter, styles]);

  const {
    paginatedItems: paginatedStyles,
    firstVisible,
    lastVisible,
    totalPages,
    safePage: safeCurrentPage,
    setPage,
  } = usePagination(filteredStyles);

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }

  function resetForm() {
    setEditingStyleId(null);
    setFormState(initialFormState);
    setError(null);
    setActionState("idle");
  }

  function updateStyleInList(nextStyle: StyleItem) {
    setStyles((current) =>
      current.map((style) => (style.style_id === nextStyle.style_id ? nextStyle : style))
    );
  }

  function handleEdit(style: StyleItem) {
    setEditingStyleId(style.style_id);
    setFormState({
      name: style.name,
      description: style.description || "",
      active: style.active,
    });
    setError(null);
  }

  async function handleToggleActive(style: StyleItem) {
    setTogglingStyleId(style.style_id);

    try {
      const data = await apiFetchData<StyleItem>(`/api/styles/${style.style_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !style.active,
        }),
      });
      updateStyleInList(data);

      if (editingStyleId === style.style_id) {
        setFormState((current) => ({
          ...current,
          active: data.active,
        }));
      }

      showSuccess(
        data.active
          ? PRODUCTS.styles.toast.activated
          : PRODUCTS.styles.toast.deactivated
      );
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : PRODUCTS.styles.saveError
      );
    } finally {
      setTogglingStyleId(null);
      setPendingStatusStyle(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStyleId) {
      return;
    }

    setActionState("validating");
    setError(null);

    if (!formState.name.trim()) {
      setError(PRODUCTS.form.errors.nameRequired);
      setActionState("idle");
      return;
    }

    setActionState("saving");

    try {
      const data = await apiFetchData<StyleItem>(`/api/styles/${editingStyleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description.trim() || null,
          active: formState.active,
        }),
      });
      updateStyleInList(data);
      showSuccess(PRODUCTS.styles.toast.updated);
      resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : PRODUCTS.styles.saveError
      );
    } finally {
      setActionState("idle");
    }
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow={PRODUCTS.header.eyebrow}
        title={PRODUCTS.styles.header.title}
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={loadData}
                  disabled={loading}
                  aria-label={PRODUCTS.styles.actions.refresh}
                  className="rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {PRODUCTS.actions.refresh}
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="rounded-lg"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {PRODUCTS.actions.newProduct}
            </Button>
          </>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: PRODUCTS.styles.metrics.stylesBase, value: styles.length },
          { label: PRODUCTS.metrics.activeStyles, value: activeCount, tone: "success" },
          { label: PRODUCTS.metrics.inactiveStyles, value: inactiveCount, tone: "warning" },
        ]}
      />

      <OpsSectionDivider className="space-y-4">
        <OpsFiltersRow className="lg:grid-cols-[1.45fr_0.84fr_auto]">
          <OpsSearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={PRODUCTS.styles.filters.searchPlaceholder}
            ariaLabel={PRODUCTS.styles.filters.searchAriaLabel}
          />

          <OpsSelect
            label="Estado"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value as "all" | "active" | "inactive");
              setPage(1);
            }}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                variant="outline"
                size="icon-sm"
                className="h-10 w-10 rounded-lg"
                aria-label={PRODUCTS.actions.clearFilters}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {PRODUCTS.actions.clearFilters}
            </TooltipContent>
          </Tooltip>
        </OpsFiltersRow>

        <OpsTableWrap minWidth="1120px">
          <div className="ops-surface-muted grid grid-cols-[1.35fr_0.92fr_0.86fr_0.86fr_0.78fr_1.16fr] gap-x-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
            <span>{PRODUCTS.styles.table.columns.style}</span>
            <span>{PRODUCTS.styles.table.columns.type}</span>
            <span>{PRODUCTS.styles.table.columns.sizes}</span>
            <span>{PRODUCTS.styles.table.columns.colors}</span>
            <span>{PRODUCTS.styles.table.columns.status}</span>
            <span>{PRODUCTS.styles.table.columns.actions}</span>
          </div>

          <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                {PRODUCTS.styles.table.loading}
              </div>
            ) : paginatedStyles.length === 0 ? (
              <OpsEmptyState
                variant="compact"
                description={
                  styles.length
                    ? PRODUCTS.styles.empty.withFilters
                    : PRODUCTS.styles.empty.noData
                }
              />
            ) : (
              paginatedStyles.map((style) => (
                <div
                  key={style.style_id}
                  className={cn(
                    "grid grid-cols-[1.35fr_0.92fr_0.86fr_0.86fr_0.78fr_1.16fr] gap-x-3 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]",
                    !style.active && "opacity-75"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {style.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {style.style_code || PRODUCTS.styles.table.noCode}
                      </span>
                      <span className="text-[11px] text-[var(--ops-text-muted)]">
                        {formatDate(style.created_at)}
                      </span>
                    </div>
                    {style.description ? (
                      <p className="mt-1 truncate text-[11px] text-[var(--ops-text-muted)]">
                        {style.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-sm text-[var(--ops-text)]">{style.garment_type_name}</div>
                  <div className="text-sm text-[var(--ops-text)]">{style.size_codes.length}</div>
                  <div className="text-sm text-[var(--ops-text)]">{style.color_codes.length}</div>

                  <div>
                    <OpsStatusBadge tone={style.active ? "success" : "neutral"}>
                      {style.active ? "Activo" : PRODUCTS.statusLabels.inactive}
                    </OpsStatusBadge>
                  </div>

                  <AdminRowActionsMenu
                    ariaLabel={`Acciones para ${style.name}`}
                    items={[
                      {
                        label: PRODUCTS.actions.edit,
                        icon: <PencilLine className="h-4 w-4" />,
                        onSelect: () => handleEdit(style),
                      },
                      {
                        label: PRODUCTS.actions.variants,
                        icon: <Shapes className="h-4 w-4" />,
                        onSelect: () =>
                          router.push(
                            `/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`
                          ),
                      },
                      {
                        label: PRODUCTS.actions.prices,
                        icon: <ReceiptText className="h-4 w-4" />,
                        onSelect: () =>
                          router.push(
                            `/precios/crear?style_id=${encodeURIComponent(style.style_id)}`
                          ),
                      },
                      {
                        label: style.active ? PRODUCTS.actions.deactivate : PRODUCTS.actions.activate,
                        icon: <Power className="h-4 w-4" />,
                        tone: style.active ? "danger" : "neutral",
                        disabled: togglingStyleId === style.style_id,
                        onSelect: () => setPendingStatusStyle(style),
                      },
                    ]}
                  />
                </div>
              ))
            )}
          </div>
        </OpsTableWrap>

        {!loading ? (
          <OpsTableFooter>
            <span className="ops-secondary-text text-[var(--ops-text-muted)]">
              {filteredStyles.length === 0
                ? PRODUCTS.styles.table.zeroResults
                : `${firstVisible}-${lastVisible} de ${filteredStyles.length}`}
            </span>
            <Pagination
              page={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              className="self-end md:self-auto"
            />
          </OpsTableFooter>
        ) : null}
      </OpsSectionDivider>

      <OpsDialog
        open={!!editingStyleId}
        onOpenChange={(open) => { if (!open) resetForm(); }}
        title={PRODUCTS.styles.dialog.title}
        description={PRODUCTS.styles.dialog.title}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <OpsFormField label={PRODUCTS.form.name} density="compact">
            <input
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder={PRODUCTS.form.namePlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField label={PRODUCTS.styles.dialog.codeLabel} density="compact">
            <OpsReadonlyFieldState
              value={styles.find((style) => style.style_id === editingStyleId)?.style_code || ""}
              placeholder={PRODUCTS.styles.dialog.noCodePlaceholder}
            />
          </OpsFormField>

          <OpsFormField label={PRODUCTS.form.garmentType} density="compact">
            <OpsReadonlyFieldState
              value={
                garmentTypes.find(
                  (item) =>
                    String(item.garment_type_id || "") ===
                    styles.find((style) => style.style_id === editingStyleId)?.garment_type_id
                )?.name || ""
              }
              placeholder={PRODUCTS.styles.dialog.noTypePlaceholder}
            />
          </OpsFormField>

          <OpsFormField label={PRODUCTS.form.description} density="compact">
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
              rows={3}
              placeholder={PRODUCTS.styles.dialog.descriptionPlaceholder}
              className={opsInputCompact}
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
                {PRODUCTS.form.descriptionCounter(
                  formState.description.length,
                  PRODUCT_DESCRIPTION_MAX_LENGTH
                )}
              </span>
            </div>
          </OpsFormField>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--ops-text)]">
            <input
              type="checkbox"
              checked={formState.active}
              onChange={(e) =>
                setFormState((current) => ({
                  ...current,
                  active: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-[var(--ops-border-strong)] text-[var(--ripnel-accent)] focus:ring-[var(--ripnel-accent)]"
            />
            {PRODUCTS.styles.dialog.activeLabel}
          </label>

          {error ? (
            <div className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm text-[var(--ops-tone-danger-text)]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={resetForm} disabled={isBusy}>
              {PRODUCTS.create.cancel}
            </Button>
            <Button variant="accent" type="submit" disabled={isBusy}>
              {actionState === "validating" ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> Validando...</>
              ) : actionState === "saving" ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> {PRODUCTS.styles.dialog.saving}</>
              ) : (
                PRODUCTS.styles.dialog.submit
              )}
            </Button>
          </div>
        </form>
      </OpsDialog>

      <OpsDialog
        open={!!pendingStatusStyle}
        onOpenChange={(open) => { if (!open) setPendingStatusStyle(null); }}
        title={pendingStatusStyle?.active ? PRODUCTS.styles.confirmModal.deactivateTitle : PRODUCTS.styles.confirmModal.activateTitle}
        description={
          pendingStatusStyle
            ? pendingStatusStyle.active
              ? PRODUCTS.styles.confirmModal.deactivateDesc(pendingStatusStyle.name)
              : PRODUCTS.styles.confirmModal.activateDesc(pendingStatusStyle.name)
            : ""
        }
        size="sm"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setPendingStatusStyle(null)}>
            {PRODUCTS.create.cancel}
          </Button>
          <Button
            variant={pendingStatusStyle?.active ? "destructive" : "accent"}
            onClick={() => { if (pendingStatusStyle) void handleToggleActive(pendingStatusStyle); }}
            disabled={Boolean(pendingStatusStyle && togglingStyleId === pendingStatusStyle.style_id)}
          >
            {togglingStyleId ? (
              <><LoaderCircle className="h-4 w-4 animate-spin" /> {pendingStatusStyle?.active ? PRODUCTS.actions.deactivate : PRODUCTS.actions.activate}...</>
            ) : (
              pendingStatusStyle?.active ? PRODUCTS.actions.deactivate : PRODUCTS.actions.activate
            )}
          </Button>
        </div>
      </OpsDialog>

      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(style) => {
          void Promise.resolve().then(loadData);
          router.push(
            `/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`
          );
        }}
      />
    </OpsPageShell>
  );
}
