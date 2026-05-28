"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  Check,
  Eye,
  LoaderCircle,
  Save,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { AdminInlineMessage } from "@/components/admin/admin-ui";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { catalogPageBySlug, type CatalogFieldConfig } from "@/lib/product-master-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OpsMultiSelectMenu,
  OpsReadonlyFieldState,
  OpsSelectionChip,
  OpsSelectMenu,
} from "@/components/ui/ops-selection";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type CatalogItem = {
  [key: string]: unknown;
  active?: boolean;
  code?: string | null;
  name?: string | null;
  hex?: string | null;
  sort_order?: number | null;
};

type CreatedStyle = {
  style_id: string;
  style_code: string | null;
  name: string;
};

type ExistingStyle = {
  style_id: string;
  name: string;
  style_code: string | null;
};

type FormState = {
  name: string;
  garment_type_id: string;
  fabric_id: string;
  fabric_detail_id: string;
  target_id: string;
  description: string;
  size_ids: string[];
  color_ids: string[];
};

type NameMode = "auto" | "manual";

type CatalogPanelKey =
  | "garmentTypes"
  | "fabrics"
  | "fabricDetails"
  | "targets"
  | "sizes"
  | "colors";

type CatalogPanelState = {
  key: CatalogPanelKey;
  values: Record<string, string>;
} | null;

type ConfirmationSummary = {
  name: string;
  garmentType: string;
  fabric: string;
  fabricDetail: string;
  target: string;
  description: string;
  sizes: string[];
  colors: Array<{ label: string; hex?: string | null }>;
};

type CatalogPanelDefinition = {
  key: CatalogPanelKey;
  slug: keyof typeof catalogPageBySlug;
  title: string;
  endpoint: string;
  idKeys: string[];
  multiSelect?: boolean;
  colorMode?: boolean;
};

const initialFormState: FormState = {
  name: "",
  garment_type_id: "",
  fabric_id: "",
  fabric_detail_id: "",
  target_id: "",
  description: "",
  size_ids: [],
  color_ids: [],
};

const catalogPanelDefinitions: Record<CatalogPanelKey, CatalogPanelDefinition> = {
  garmentTypes: {
    key: "garmentTypes",
    slug: "tipo-prenda",
    title: "Nuevo tipo de prenda",
    endpoint: "/api/garment-types",
    idKeys: ["garment_type_id"],
  },
  fabrics: {
    key: "fabrics",
    slug: "telas",
    title: "Nueva tela",
    endpoint: "/api/fabrics",
    idKeys: ["fabric_id"],
  },
  fabricDetails: {
    key: "fabricDetails",
    slug: "detalle-de-tela",
    title: "Nuevo detalle de tela",
    endpoint: "/api/fabric-details",
    idKeys: ["fabric_detail_id"],
  },
  targets: {
    key: "targets",
    slug: "targets",
    title: "Nuevo target",
    endpoint: "/api/targets",
    idKeys: ["target_id"],
  },
  sizes: {
    key: "sizes",
    slug: "tallas",
    title: "Nueva talla",
    endpoint: "/api/sizes",
    idKeys: ["size_id"],
    multiSelect: true,
  },
  colors: {
    key: "colors",
    slug: "colores",
    title: "Nuevo color",
    endpoint: "/api/colors",
    idKeys: ["color_id"],
    multiSelect: true,
    colorMode: true,
  },
};

function getItemId(item: CatalogItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value) {
      return String(value);
    }
  }

  return "";
}

function getCatalogItemName(item: CatalogItem) {
  return String(item.name || "");
}

function getCatalogVisibleLabel(item: CatalogItem) {
  return String(item.name || item.code || "");
}

function getSizeLabel(item: CatalogItem) {
  return String(item.code || item.name || "");
}

function sortSizes(items: CatalogItem[]) {
  return [...items].sort((left, right) => {
    const leftOrder = Number(left.sort_order ?? 0);
    const rightOrder = Number(right.sort_order ?? 0);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return getSizeLabel(left).localeCompare(getSizeLabel(right));
  });
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function buildAutoName(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function buildCatalogInitialValues(fields: CatalogFieldConfig[]) {
  return Object.fromEntries(fields.map((field) => [field.key, ""])) as Record<string, string>;
}

function normalizeComparableText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function orderCatalogFields(fields: CatalogFieldConfig[]) {
  return [...fields].sort((left, right) => {
    if (left.key === "name") {
      return -1;
    }

    if (right.key === "name") {
      return 1;
    }

    if (left.key === "code") {
      return 1;
    }

    if (right.key === "code") {
      return -1;
    }

    return 0;
  });
}

async function requestData<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = await apiFetch<T | ApiEnvelope<T>>(path, {
    cache: "no-store",
    ...init,
  });

  return unwrapApiData(payload);
}

function FieldLabel({
  children,
  actionLabel,
  onAction,
  htmlFor,
}: {
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--ops-text)]">{children}</label>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function MultiSelectCatalog({
  label,
  items,
  selectedIds,
  idKeys,
  placeholder,
  onToggle,
  onCreate,
  colorMode = false,
}: {
  label: string;
  items: CatalogItem[];
  selectedIds: string[];
  idKeys: string[];
  placeholder: string;
  onToggle: (id: string) => void;
  onCreate: () => void;
  colorMode?: boolean;
}) {
  const selectedItems = items.filter((item) => selectedIds.includes(getItemId(item, idKeys)));
  const options = items.map((item) => {
    const itemId = getItemId(item, idKeys);
    const visibleLabel = colorMode ? getCatalogVisibleLabel(item) : getSizeLabel(item);

    return {
      value: itemId,
      label: visibleLabel,
      leading: colorMode ? (
        <span
          className="h-3.5 w-3.5 rounded-full border border-[color:var(--ops-border-soft)]"
          style={{ backgroundColor: item.hex || "#ffffff" }}
        />
      ) : undefined,
    };
  });

  return (
    <section className="space-y-2">
      <FieldLabel actionLabel="Crear nuevo" onAction={onCreate}>{label}</FieldLabel>
      <OpsMultiSelectMenu
        selectedValues={selectedIds}
        onToggle={onToggle}
        placeholder={placeholder}
        options={options}
        formatCountLabel={(count) => `${count} ${label.toLowerCase()} seleccionadas`}
      />
      <div className="flex min-h-8 flex-wrap gap-1.5">
        {selectedItems.length ? (
          selectedItems.map((item) => {
            const id = getItemId(item, idKeys);
            return (
              <OpsSelectionChip
                key={id}
                label={colorMode ? getCatalogVisibleLabel(item) : getSizeLabel(item)}
                leading={
                  colorMode ? (
                    <span
                      className="h-3 w-3 rounded-full border border-[color:var(--ops-border-soft)]"
                      style={{ backgroundColor: item.hex || "#ffffff" }}
                    />
                  ) : undefined
                }
                onRemove={() => onToggle(id)}
              />
            );
          })
        ) : (
          <span className="text-xs text-[var(--ops-text-muted)]">
            {colorMode ? "Sin colores: se usara UNICO si aplica." : "Selecciona al menos una talla."}
          </span>
        )}
      </div>
    </section>
  );
}

function ConfirmationDialog({
  open,
  onOpenChange,
  summary,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ConfirmationSummary | null;
  submitting: boolean;
  onConfirm: () => Promise<void>;
}) {
  if (!summary) {
    return null;
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5 shadow-xl outline-none data-open:animate-in data-open:zoom-in-95 data-closed:animate-out data-closed:zoom-out-95">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-soft)] pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ripnel-accent-hover)]">
                Confirmacion
              </p>
              <DialogPrimitive.Title className="text-xl font-semibold text-[var(--ops-text)]">
                Revisar nuevo producto
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                Nombre final
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">{summary.name}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--ops-border-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                  Configuracion base
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--ops-text)]">
                  <p>Tipo: {summary.garmentType}</p>
                  <p>Tela: {summary.fabric}</p>
                  <p>Detalle: {summary.fabricDetail}</p>
                  <p>Target: {summary.target}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--ops-border-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                  Configuracion comercial
                </p>
                <div className="mt-3 space-y-3 text-sm text-[var(--ops-text)]">
                  <div>
                    <p className="font-medium">Tallas</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {summary.sizes.map((size) => (
                        <span key={size} className="ops-metric-pill rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Colores</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {summary.colors.length ? (
                        summary.colors.map((color) => (
                          <span
                            key={color.label}
                            className="ops-metric-pill inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          >
                            {color.hex ? (
                              <span
                                className="h-3 w-3 rounded-full border border-[color:var(--ops-border-soft)]"
                                style={{ backgroundColor: color.hex }}
                              />
                            ) : null}
                            {color.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--ops-text-muted)]">UNICO si aplica</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {summary.description ? (
              <div className="rounded-lg border border-[var(--ops-border-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                  Descripcion
                </p>
                <p className="mt-2 text-sm text-[var(--ops-text)]">{summary.description}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" className="rounded-lg">
                Cancelar
              </Button>
            </DialogPrimitive.Close>
            <Button type="button" variant="accent" className="rounded-lg" disabled={submitting} onClick={() => void onConfirm()}>
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar creacion
                </>
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ProductCreatePage() {
  const nameId = useId();
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [nameMode, setNameMode] = useState<NameMode>("auto");
  const [garmentTypes, setGarmentTypes] = useState<CatalogItem[]>([]);
  const [fabrics, setFabrics] = useState<CatalogItem[]>([]);
  const [fabricDetails, setFabricDetails] = useState<CatalogItem[]>([]);
  const [targets, setTargets] = useState<CatalogItem[]>([]);
  const [sizes, setSizes] = useState<CatalogItem[]>([]);
  const [colors, setColors] = useState<CatalogItem[]>([]);
  const [existingStyles, setExistingStyles] = useState<ExistingStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [createdStyle, setCreatedStyle] = useState<CreatedStyle | null>(null);
  const [catalogPanel, setCatalogPanel] = useState<CatalogPanelState>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationSummary | null>(null);

  async function loadOptions() {
    const [
      garmentTypesData,
      fabricsData,
      fabricDetailsData,
      targetsData,
      sizesData,
      colorsData,
      stylesData,
    ] = await Promise.all([
      requestData<CatalogItem[]>("/api/garment-types"),
      requestData<CatalogItem[]>("/api/fabrics"),
      requestData<CatalogItem[]>("/api/fabric-details"),
      requestData<CatalogItem[]>("/api/targets"),
      requestData<CatalogItem[]>("/api/sizes"),
      requestData<CatalogItem[]>("/api/colors"),
      requestData<ExistingStyle[]>("/api/styles"),
    ]);

    const activeGarmentTypes = garmentTypesData.filter((item) => item.active !== false);
    const activeFabrics = fabricsData.filter((item) => item.active !== false);
    const activeFabricDetails = fabricDetailsData.filter((item) => item.active !== false);
    const activeTargets = targetsData.filter((item) => item.active !== false);
    const activeSizes = sortSizes(sizesData.filter((item) => item.active !== false));
    const activeColors = colorsData.filter((item) => item.active !== false);
    const mujerTarget = activeTargets.find(
      (item) => String(item.name || "").trim().toLowerCase() === "mujer"
    );

    setGarmentTypes(activeGarmentTypes);
    setFabrics(activeFabrics);
    setFabricDetails(activeFabricDetails);
    setTargets(activeTargets);
    setSizes(activeSizes);
    setColors(activeColors);
    setExistingStyles(stylesData);
    setFormState((current) => {
      if (current.target_id || !mujerTarget) {
        return current;
      }

      return {
        ...current,
        target_id: getItemId(mujerTarget, ["target_id"]),
      };
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        await loadOptions();
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? `No se pudo cargar catalogos: ${requestError.message}`
              : "No se pudo cargar catalogos para crear el producto"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void Promise.resolve().then(run);

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGarmentType = useMemo(
    () => garmentTypes.find((item) => getItemId(item, ["garment_type_id"]) === formState.garment_type_id) || null,
    [formState.garment_type_id, garmentTypes]
  );
  const selectedFabric = useMemo(
    () => fabrics.find((item) => getItemId(item, ["fabric_id"]) === formState.fabric_id) || null,
    [fabrics, formState.fabric_id]
  );
  const selectedFabricDetail = useMemo(
    () =>
      fabricDetails.find((item) => getItemId(item, ["fabric_detail_id"]) === formState.fabric_detail_id) || null,
    [fabricDetails, formState.fabric_detail_id]
  );
  const selectedTarget = useMemo(
    () => targets.find((item) => getItemId(item, ["target_id"]) === formState.target_id) || null,
    [formState.target_id, targets]
  );

  const autoName = useMemo(
    () =>
      buildAutoName([
        getCatalogItemName(selectedGarmentType || {}),
        getCatalogItemName(selectedFabric || {}),
        getCatalogItemName(selectedFabricDetail || {}),
      ]),
    [selectedFabric, selectedFabricDetail, selectedGarmentType]
  );
  const resolvedName = nameMode === "auto" ? autoName : formState.name;

  const confirmationSummary = useMemo<ConfirmationSummary | null>(() => {
    if (!resolvedName.trim() || !formState.garment_type_id || !formState.size_ids.length) {
      return null;
    }

    const sizeLabels = sizes
      .filter((item) => formState.size_ids.includes(getItemId(item, ["size_id"])))
      .map((item) => getSizeLabel(item));
    const colorItems = colors.filter((item) => formState.color_ids.includes(getItemId(item, ["color_id"])));

    return {
      name: resolvedName.trim(),
      garmentType: getCatalogItemName(selectedGarmentType || {}) || "-",
      fabric: getCatalogItemName(selectedFabric || {}) || "Sin tela",
      fabricDetail: getCatalogItemName(selectedFabricDetail || {}) || "Sin detalle",
      target: getCatalogItemName(selectedTarget || {}) || "Sin target",
      description: formState.description.trim(),
      sizes: sizeLabels,
      colors: colorItems.map((item) => ({
        label: getCatalogVisibleLabel(item),
        hex: item.hex,
      })),
    };
  }, [
    colors,
    formState.color_ids,
    formState.description,
    formState.garment_type_id,
    resolvedName,
    formState.size_ids,
    selectedFabric,
    selectedFabricDetail,
    selectedGarmentType,
    selectedTarget,
    sizes,
  ]);

  const normalizedCurrentName = normalizeComparableText(resolvedName);
  const duplicatedStyle = useMemo(
    () =>
      existingStyles.find(
        (style) => normalizeComparableText(style.name) === normalizedCurrentName
      ) || null,
    [existingStyles, normalizedCurrentName]
  );

  async function handleCreateProduct() {
    setSubmitting(true);
    setError(null);
    setCreatedStyle(null);

    try {
      const style = await requestData<CreatedStyle>("/api/styles", {
        method: "POST",
        body: JSON.stringify({
          name: resolvedName.trim(),
          garment_type_id: formState.garment_type_id,
          fabric_id: formState.fabric_id || null,
          fabric_detail_id: formState.fabric_detail_id || null,
          target_id: formState.target_id || null,
          description: formState.description.trim() || null,
          active: true,
        }),
      });

      await requestData(`/api/variants/styles/${style.style_id}/config`, {
        method: "PUT",
        body: JSON.stringify({
          size_ids: formState.size_ids,
          color_ids: formState.color_ids,
        }),
      });

      await requestData(`/api/variants/styles/${style.style_id}/generate`, {
        method: "POST",
      });

      setCreatedStyle(style);
      setFormState((current) => ({
        ...initialFormState,
        target_id: current.target_id,
      }));
      setNameMode("auto");
      setPendingConfirmation(null);
      setConfirmationOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el producto"
      );
      setConfirmationOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function openSummary() {
    if (!confirmationSummary) return;
    setError(null);
    setPendingConfirmation(confirmationSummary);
    setConfirmationOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (duplicatedStyle) {
      setError("Ya existe un style con ese nombre. Ajusta el nombre antes de crear.");
      return;
    }

    if (!confirmationSummary) {
      return;
    }

    setPendingConfirmation(confirmationSummary);
    setConfirmationOpen(true);
  }

  function openCatalogPanel(key: CatalogPanelKey) {
    const definition = catalogPanelDefinitions[key];
    const metadata = catalogPageBySlug[definition.slug];

    setCatalogError(null);
    setCatalogPanel({
      key,
      values: buildCatalogInitialValues(metadata.fields),
    });
  }

  async function refreshCatalogByKey(key: CatalogPanelKey) {
    const definition = catalogPanelDefinitions[key];
    const items = await requestData<CatalogItem[]>(definition.endpoint);
    const filteredItems = items.filter((item) => item.active !== false);

    if (key === "garmentTypes") {
      setGarmentTypes(filteredItems);
      return filteredItems;
    }

    if (key === "fabrics") {
      setFabrics(filteredItems);
      return filteredItems;
    }

    if (key === "fabricDetails") {
      setFabricDetails(filteredItems);
      return filteredItems;
    }

    if (key === "targets") {
      setTargets(filteredItems);
      return filteredItems;
    }

    if (key === "sizes") {
      const ordered = sortSizes(filteredItems);
      setSizes(ordered);
      return ordered;
    }

    setColors(filteredItems);
    return filteredItems;
  }

async function handleCatalogCreate(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!catalogPanel) {
    return;
  }

  if (hasCatalogNameDuplicate) {
    setCatalogError("Ya existe un registro con ese nombre.");
    return;
  }

  const definition = catalogPanelDefinitions[catalogPanel.key];
  setCatalogSubmitting(true);
    setCatalogError(null);

    try {
      const createdItem = await requestData<CatalogItem>(definition.endpoint, {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(catalogPanel.values).map(([key, value]) => [key, value.trim()])
          )
        ),
      });

      await refreshCatalogByKey(catalogPanel.key);
      const createdId = getItemId(createdItem, definition.idKeys);

      setFormState((current) => {
        if (definition.key === "garmentTypes") {
          return { ...current, garment_type_id: createdId };
        }
        if (definition.key === "fabrics") {
          return { ...current, fabric_id: createdId };
        }
        if (definition.key === "fabricDetails") {
          return { ...current, fabric_detail_id: createdId };
        }
        if (definition.key === "targets") {
          return { ...current, target_id: createdId };
        }
        if (definition.key === "sizes") {
          return { ...current, size_ids: toggleId(current.size_ids, createdId) };
        }
        return { ...current, color_ids: toggleId(current.color_ids, createdId) };
      });

      setCatalogPanel(null);
    } catch (requestError) {
      setCatalogError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el registro"
      );
    } finally {
      setCatalogSubmitting(false);
    }
  }

  const activeCatalogDefinition = catalogPanel ? catalogPanelDefinitions[catalogPanel.key] : null;
  const activeCatalogMetadata = activeCatalogDefinition
    ? catalogPageBySlug[activeCatalogDefinition.slug]
    : null;
  const activeCatalogItems = (() => {
    if (!catalogPanel) {
      return [];
    }

    if (catalogPanel.key === "garmentTypes") {
      return garmentTypes;
    }

    if (catalogPanel.key === "fabrics") {
      return fabrics;
    }

    if (catalogPanel.key === "fabricDetails") {
      return fabricDetails;
    }

    if (catalogPanel.key === "targets") {
      return targets;
    }

    if (catalogPanel.key === "sizes") {
      return sizes;
    }

    return colors;
  })();
  const normalizedCatalogName = normalizeComparableText(catalogPanel?.values.name || "");
  const hasCatalogNameDuplicate = (() => {
    if (!catalogPanel || !normalizedCatalogName || catalogPanel.key === "sizes") {
      return false;
    }

    return activeCatalogItems.some(
      (item) => normalizeComparableText(String(item.name || "")) === normalizedCatalogName
    );
  })();

  return (
    <>
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <PosHeader
            eyebrow="Productos"
            title="Nuevo producto"
            actions={
              <Button variant="accent" size="sm" className="rounded-lg px-3" onClick={openSummary}>
                <Eye className="h-3.5 w-3.5" /> Ver resumen
              </Button>
            }
          />

          {error ? (
            <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
          ) : null}

          {createdStyle ? (
            <AdminInlineMessage tone="success">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{createdStyle.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={`/productos/variantes?style_id=${encodeURIComponent(createdStyle.style_id)}`}>
                      Variantes
                    </Link>
                  </Button>
                  <Button asChild variant="accent" size="sm" className="rounded-lg">
                    <Link href={`/precios/crear?style_id=${encodeURIComponent(createdStyle.style_id)}`}>
                      Precios
                    </Link>
                  </Button>
                </div>
              </div>
            </AdminInlineMessage>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-b border-[color:var(--ops-border-soft)] pb-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor={nameId}
                    actionLabel={nameMode === "auto" ? "Editar" : undefined}
                    onAction={
                      nameMode === "auto"
                        ? () => {
                            setNameMode("manual");
                            setFormState((current) => ({ ...current, name: autoName }));
                          }
                        : undefined
                    }
                  >
                    Nombre
                  </FieldLabel>
                  {nameMode === "auto" ? (
                    <OpsReadonlyFieldState
                      value={resolvedName}
                      placeholder="Se completará automáticamente"
                    />
                  ) : (
                    <Input
                      id={nameId}
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, name: event.target.value }))
                      }
                      className="bg-[var(--ops-surface)] h-10 rounded-lg border"
                      required
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {duplicatedStyle ? (
                      <span className="font-medium text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                        Ya existe un style con este nombre.
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel actionLabel="Crear nuevo" onAction={() => openCatalogPanel("garmentTypes")}>Tipo de prenda</FieldLabel>
                  <OpsSelectMenu
                    value={formState.garment_type_id}
                    onValueChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        garment_type_id: value,
                      }))
                    }
                    placeholder="Seleccionar"
                    options={garmentTypes.map((item) => ({
                      value: getItemId(item, ["garment_type_id"]),
                      label: getCatalogVisibleLabel(item),
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel actionLabel="Crear nuevo" onAction={() => openCatalogPanel("fabrics")}>Tela</FieldLabel>
                  <OpsSelectMenu
                    value={formState.fabric_id}
                    onValueChange={(value) =>
                      setFormState((current) => ({ ...current, fabric_id: value }))
                    }
                    placeholder="Sin tela"
                    options={fabrics.map((item) => ({
                      value: getItemId(item, ["fabric_id"]),
                      label: getCatalogVisibleLabel(item),
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel actionLabel="Crear nuevo" onAction={() => openCatalogPanel("fabricDetails")}>Detalle</FieldLabel>
                  <OpsSelectMenu
                    value={formState.fabric_detail_id}
                    onValueChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        fabric_detail_id: value,
                      }))
                    }
                    placeholder="Sin detalle"
                    options={fabricDetails.map((item) => ({
                      value: getItemId(item, ["fabric_detail_id"]),
                      label: getCatalogVisibleLabel(item),
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel actionLabel="Crear nuevo" onAction={() => openCatalogPanel("targets")}>Target</FieldLabel>
                  <OpsSelectMenu
                    value={formState.target_id}
                    onValueChange={(value) =>
                      setFormState((current) => ({ ...current, target_id: value }))
                    }
                    placeholder="Sin target"
                    options={targets.map((item) => ({
                      value: getItemId(item, ["target_id"]),
                      label: getCatalogItemName(item),
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--ops-text)]">Descripción</label>
                  <Input
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="bg-[var(--ops-surface)] h-10 rounded-lg border"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <MultiSelectCatalog
                label="Tallas"
                items={sizes}
                selectedIds={formState.size_ids}
                idKeys={["size_id"]}
                placeholder="Seleccionar tallas"
                onCreate={() => openCatalogPanel("sizes")}
                onToggle={(id) =>
                  setFormState((current) => ({
                    ...current,
                    size_ids: toggleId(current.size_ids, id),
                  }))
                }
              />

              <MultiSelectCatalog
                label="Colores"
                items={colors}
                selectedIds={formState.color_ids}
                idKeys={["color_id"]}
                placeholder="Seleccionar colores"
                colorMode
                onCreate={() => openCatalogPanel("colors")}
                onToggle={(id) =>
                  setFormState((current) => ({
                    ...current,
                    color_ids: toggleId(current.color_ids, id),
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-[color:var(--ops-border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ops-text-muted)]">
                <span>{loading ? "Cargando catalogos…" : `${formState.size_ids.length} tallas seleccionadas`}</span>
                <span>·</span>
                <span>{`${formState.color_ids.length} colores seleccionados`}</span>
              </div>
              <Button
                type="submit"
                variant="accent"
                className="rounded-lg"
                disabled={
                  loading ||
                  submitting ||
                  !formState.size_ids.length ||
                  !resolvedName.trim() ||
                  !formState.garment_type_id ||
                  Boolean(duplicatedStyle)
                }
              >
                <Save className="h-4 w-4" />
                Crear producto
              </Button>
            </div>
          </form>

          {!loading && !sizes.length ? (
            <AdminInlineMessage tone="warning">Carga tallas en catalogos antes de crear productos.</AdminInlineMessage>
          ) : null}
        </div>
      </section>

      <Sheet
        open={Boolean(catalogPanel)}
        onOpenChange={(open) => {
          if (!open) {
            setCatalogPanel(null);
            setCatalogError(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] sm:max-w-xl">
          {catalogPanel && activeCatalogDefinition && activeCatalogMetadata ? (
            <>
              <SheetHeader className="border-b border-[var(--ops-border-soft)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ripnel-accent-hover)]">
                  Catalogo rapido
                </p>
                <SheetTitle className="text-xl font-semibold text-[var(--ops-text)]">
                  {activeCatalogDefinition.title}
                </SheetTitle>
                <SheetDescription className="text-sm text-[var(--ops-text-muted)]">
                  Completa el alta sin salir del borrador actual del producto.
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleCatalogCreate} className="flex h-full flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  <div className="rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)]">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {activeCatalogMetadata.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--ops-text-muted)]">
                          {activeCatalogMetadata.createDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  {orderCatalogFields(activeCatalogMetadata.fields).map((field) => {
                    const value = catalogPanel.values[field.key] || "";

                    return (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-sm font-semibold text-[var(--ops-text)]">
                          {field.label}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={value}
                            onChange={(event) =>
                              setCatalogPanel((current) =>
                                current
                                  ? {
                                      ...current,
                                      values: {
                                        ...current.values,
                                        [field.key]: event.target.value,
                                      },
                                    }
                                  : current
                              )
                            }
                            placeholder={field.placeholder}
                            className="bg-[var(--ops-surface)] min-h-24 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                          />
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            value={value}
                            onChange={(event) =>
                              setCatalogPanel((current) =>
                                current
                                  ? {
                                      ...current,
                                      values: {
                                        ...current.values,
                                        [field.key]: event.target.value,
                                      },
                                    }
                                  : current
                              )
                            }
                            placeholder={field.placeholder}
                            className="h-10 rounded-lg"
                          />
                        )}
                        {field.helper ? (
                          <p className="text-xs text-[var(--ops-text-muted)]">{field.helper}</p>
                        ) : null}
                      </div>
                    );
                  })}

                  {catalogError ? (
                    <AdminInlineMessage tone="danger">{catalogError}</AdminInlineMessage>
                  ) : null}

                  {hasCatalogNameDuplicate ? (
                    <AdminInlineMessage tone="warning">Ya existe un registro con ese nombre. Cambia el nombre antes de guardar.</AdminInlineMessage>
                  ) : null}
                </div>

                <SheetFooter className="border-t border-[var(--ops-border-soft)] bg-[var(--ops-surface)]">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="rounded-lg" onClick={() => setCatalogPanel(null)}>
                      Volver
                    </Button>
                    <Button
                      type="submit"
                      variant="accent"
                      className="rounded-lg"
                      disabled={catalogSubmitting || hasCatalogNameDuplicate}
                    >
                      {catalogSubmitting ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Guardando…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Guardar y volver
                        </>
                      )}
                    </Button>
                  </div>
                </SheetFooter>
              </form>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        summary={pendingConfirmation}
        submitting={submitting}
        onConfirm={handleCreateProduct}
      />
    </>
  );
}
