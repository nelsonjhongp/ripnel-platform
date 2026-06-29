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
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminConfirmModal,
  AdminField,
  AdminFormActionsBar,
  AdminInlineMessage,
  AdminInput,
  AdminModalShell,
  AdminRowActionsMenu,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import { apiFetchData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpsReadonlyFieldState, OpsSelect } from "@/components/ui/ops-selection";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { ProductCreateDialog } from "./product-create-dialog";
import { PRODUCTS } from "./products-messages";
import { PRODUCT_DESCRIPTION_MAX_LENGTH } from "./products-utils";
import type { CatalogItem, StatusFilter } from "@/types/products";

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
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingStatusStyle, setPendingStatusStyle] = useState<StyleItem | null>(null);
  const [togglingStyleId, setTogglingStyleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const hasAppliedInitialSelection = useRef(false);

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
          : "No se pudo cargar estilos"
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
    setSuccessMessage(null);
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
    setSuccessMessage(null);
  }

  async function handleToggleActive(style: StyleItem) {
    setTogglingStyleId(style.style_id);
    setError(null);
    setSuccessMessage(null);

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

      setSuccessMessage(
        data.active
          ? "Style activado correctamente."
          : "Style inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el style"
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

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

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
      setSuccessMessage("Style actualizado correctamente.");
      resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el style"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Productos"
          title="Estilos de producto"
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
                    aria-label="Actualizar estilos"
                    className="rounded-lg"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Actualizar
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
            { label: "Styles base", value: styles.length },
            { label: "Activos", value: activeCount, tone: "success" },
            { label: "Inactivos", value: inactiveCount, tone: "warning" },
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
              placeholder="Buscar por style, código o tipo de prenda"
              ariaLabel="Buscar styles"
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

          <OpsTableWrap minWidth="1120px">
            <div className="ops-surface-muted grid grid-cols-[1.35fr_0.92fr_0.86fr_0.86fr_0.78fr_1.16fr] gap-x-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
              <span>Style</span>
              <span>Tipo</span>
              <span>Tallas</span>
              <span>Colores</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                  <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Cargando styles…
                </div>
              ) : paginatedStyles.length === 0 ? (
                <OpsEmptyState
                  variant="compact"
                  description={
                    styles.length
                      ? "No se encontraron styles con los filtros aplicados."
                      : "Aun no hay styles registrados."
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
                          {style.style_code || "Sin código"}
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
                        {style.active ? "Activo" : "Inactivo"}
                      </OpsStatusBadge>
                    </div>

                    <AdminRowActionsMenu
                      ariaLabel={`Acciones para ${style.name}`}
                      items={[
                        {
                          label: "Editar",
                          icon: <PencilLine className="h-4 w-4" />,
                          onSelect: () => handleEdit(style),
                        },
                        {
                          label: "Variantes",
                          icon: <Shapes className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(
                              `/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`
                            ),
                        },
                        {
                          label: "Precios",
                          icon: <ReceiptText className="h-4 w-4" />,
                          onSelect: () =>
                            router.push(
                              `/precios/crear?style_id=${encodeURIComponent(style.style_id)}`
                            ),
                        },
                        {
                          label: style.active ? "Inactivar" : "Activar",
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
                  ? "0 resultados"
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

        {editingStyleId ? (
          <AdminModalShell
            title="Editar style"
            onClose={resetForm}
            widthClass="max-w-3xl"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <AdminField label="Nombre">
                <AdminInput
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Polo oversize básico"
                  required
                />
              </AdminField>

              <AdminField label="Código">
                <OpsReadonlyFieldState
                  value={styles.find((style) => style.style_id === editingStyleId)?.style_code || ""}
                  placeholder="Sin código"
                />
              </AdminField>

              <AdminField label="Tipo de prenda">
                <OpsReadonlyFieldState
                  value={
                    garmentTypes.find(
                      (item) =>
                        String(item.garment_type_id || "") ===
                        styles.find((style) => style.style_id === editingStyleId)?.garment_type_id
                    )?.name || ""
                  }
                  placeholder="Sin tipo"
                />
              </AdminField>

              <AdminField label="Descripción">
                <AdminTextarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                  placeholder="Notas internas del style"
                />
                <div className="mt-1 flex justify-end">
                  <span className="text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
                    {PRODUCTS.form.descriptionCounter(
                      formState.description.length,
                      PRODUCT_DESCRIPTION_MAX_LENGTH
                    )}
                  </span>
                </div>
              </AdminField>

              <AdminCheckboxField
                label="Style activo"
                checked={formState.active}
                onChange={(checked) =>
                  setFormState((current) => ({
                    ...current,
                    active: checked,
                  }))
                }
              />

              {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
              {successMessage ? (
                <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
              ) : null}

              <AdminFormActionsBar>
                <AdminActionButton type="button" onClick={resetForm}>
                  Cancelar
                </AdminActionButton>
                <AdminActionButton type="submit" tone="accent" disabled={submitting}>
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <PencilLine className="h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </AdminActionButton>
              </AdminFormActionsBar>
            </form>
          </AdminModalShell>
        ) : null}

        <AdminConfirmModal
          open={Boolean(pendingStatusStyle)}
          title={pendingStatusStyle?.active ? "Inactivar style" : "Activar style"}
          description={
            pendingStatusStyle
              ? pendingStatusStyle.active
                ? `Inactivarás ${pendingStatusStyle.name}.`
                : `Activarás ${pendingStatusStyle.name}.`
              : ""
          }
          confirmLabel={pendingStatusStyle?.active ? "Inactivar" : "Activar"}
          confirmTone={pendingStatusStyle?.active ? "danger" : "accent"}
          busy={Boolean(
            pendingStatusStyle && togglingStyleId === pendingStatusStyle.style_id
          )}
          onCancel={() => setPendingStatusStyle(null)}
          onConfirm={() => {
            if (pendingStatusStyle) {
              void handleToggleActive(pendingStatusStyle);
            }
          }}
        />
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
    </TooltipProvider>
  );
}
