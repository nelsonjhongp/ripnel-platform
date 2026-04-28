"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  CircleAlert,
  LoaderCircle,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Shirt,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type StyleItem = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_name: string;
  fabric_name: string | null;
  fabric_detail_name: string | null;
  target_name: string | null;
  configured_size_count: number;
  configured_color_count: number;
  expected_variant_count: number;
  variant_count: number;
  retail_sizes_covered_count: number;
  wholesale_sizes_covered_count: number;
  missing_retail_size_count: number;
  missing_wholesale_size_count: number;
  total_stock_qty: number;
  status:
    | "inactive"
    | "draft"
    | "pending_variants"
    | "pending_prices"
    | "ready_no_stock"
    | "ready";
  next_step_label: string;
  warnings: {
    missing_wholesale_prices: boolean;
    stock_without_retail_price: boolean;
  };
};

type StyleBase = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_name: string;
  fabric_name: string | null;
  fabric_detail_name: string | null;
  target_name: string | null;
};

type SizeItem = {
  size_id: string;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
};

type ColorItem = {
  color_id: string;
  code: string | null;
  name: string;
  hex?: string | null;
  active: boolean;
};

type VariantItem = {
  variant_id: string;
  size_id: string;
  size_code: string;
  size_name: string;
  color_id: string;
  color_code: string;
  color_name: string;
  sku: string;
  barcode: string | null;
  active: boolean;
};

type VariantSnapshot = {
  style: StyleBase;
  configured_sizes: SizeItem[];
  configured_colors: ColorItem[];
  variants: VariantItem[];
  summary: {
    total_possible: number;
    existing_count: number;
    missing_count: number;
  };
};

type WorkspaceSize = {
  size_id: string;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
  has_current_retail_price: boolean;
  has_current_wholesale_price: boolean;
  retail_price_count: number;
  wholesale_price_count: number;
  current_retail_price: number | null;
  current_wholesale_price: number | null;
  stock_qty: number;
  has_stock: boolean;
};

type ProductWorkspace = {
  product: StyleItem;
  configured_sizes: WorkspaceSize[];
  configured_colors: ColorItem[];
};

type VariantFormState = {
  sizeIds: string[];
  colorIds: string[];
};

type StatusFilter = "all" | "active" | "inactive";

const initialFormState: VariantFormState = {
  sizeIds: [],
  colorIds: [],
};

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").toLowerCase();
}

function matchesStatusFilter(active: boolean, filter: StatusFilter) {
  if (filter === "active") {
    return active;
  }

  if (filter === "inactive") {
    return !active;
  }

  return true;
}

function sortByActive<T extends { active: boolean }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.active === right.active) {
      return 0;
    }

    return left.active ? -1 : 1;
  });
}

async function requestApiData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar Variantes");
  }

  return payload.data;
}

async function requestVariantsBaseData() {
  const [stylesData, sizesData, colorsData] = await Promise.all([
    requestApiData<StyleItem[]>("/api/products"),
    requestApiData<SizeItem[]>("/api/sizes"),
    requestApiData<ColorItem[]>("/api/colors"),
  ]);

  return {
    stylesData,
    sizesData,
    colorsData,
  };
}

function getStatusBadgeClass(status: StyleItem["status"]) {
  if (status === "ready") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "ready_no_stock") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "pending_prices") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "pending_variants") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "draft") {
    return "bg-slate-900 text-white";
  }

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: StyleItem["status"]) {
  if (status === "pending_variants") {
    return "Faltan variantes";
  }

  if (status === "pending_prices") {
    return "Faltan precios";
  }

  if (status === "ready_no_stock") {
    return "Listo sin stock";
  }

  if (status === "draft") {
    return "Borrador";
  }

  if (status === "ready") {
    return "Listo";
  }

  return "Inactivo";
}

export function VariantsPage({
  initialStyleId = null,
}: {
  initialStyleId?: string | null;
}) {
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [selectedSnapshot, setSelectedSnapshot] = useState<VariantSnapshot | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<ProductWorkspace | null>(null);
  const [formState, setFormState] = useState<VariantFormState>(initialFormState);
  const [styleSearch, setStyleSearch] = useState("");
  const [styleStatusFilter, setStyleStatusFilter] = useState<StatusFilter>("all");
  const [variantSearch, setVariantSearch] = useState("");
  const [variantStatusFilter, setVariantStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [togglingVariantId, setTogglingVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const hasAppliedInitialSelection = useRef(false);

  async function loadBaseData() {
    setLoading(true);
    setError(null);

    try {
      const { stylesData, sizesData, colorsData } = await requestVariantsBaseData();

      setStyles(stylesData);
      setSizes(sizesData);
      setColors(colorsData);

      if (!selectedStyleId && stylesData.length) {
        const preferredStyle =
          initialStyleId &&
          stylesData.find((style) => style.style_id === initialStyleId)?.style_id;

        setSelectedStyleId(preferredStyle || stylesData[0].style_id);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la base de Variantes"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStyleSnapshot(styleId: string) {
    setLoadingSelected(true);
    setError(null);

    try {
      const [snapshot, workspace] = await Promise.all([
        requestApiData<VariantSnapshot>(`/api/variants/styles/${styleId}`),
        requestApiData<ProductWorkspace>(`/api/products/${styleId}/workspace`),
      ]);
      setSelectedSnapshot(snapshot);
      setSelectedWorkspace(workspace);
      setFormState({
        sizeIds: snapshot.configured_sizes.map((item) => item.size_id),
        colorIds: snapshot.configured_colors.map((item) => item.color_id),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la configuracion del style"
      );
      setSelectedSnapshot(null);
      setSelectedWorkspace(null);
      setFormState(initialFormState);
    } finally {
      setLoadingSelected(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    requestVariantsBaseData()
      .then(({ stylesData, sizesData, colorsData }) => {
        if (cancelled) {
          return;
        }

        setStyles(stylesData);
        setSizes(sizesData);
        setColors(colorsData);

        if (stylesData.length) {
          const preferredStyle =
            initialStyleId &&
            stylesData.find((style) => style.style_id === initialStyleId)?.style_id;

          setSelectedStyleId((current) => current || preferredStyle || stylesData[0].style_id);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar la base de Variantes"
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialStyleId]);

  useEffect(() => {
    if (
      hasAppliedInitialSelection.current ||
      !initialStyleId ||
      !styles.some((style) => style.style_id === initialStyleId)
    ) {
      return;
    }

    hasAppliedInitialSelection.current = true;
    setSelectedStyleId(initialStyleId);
  }, [initialStyleId, styles]);

  useEffect(() => {
    if (!selectedStyleId) {
      setSelectedSnapshot(null);
      setSelectedWorkspace(null);
      setFormState(initialFormState);
      return;
    }

    loadStyleSnapshot(selectedStyleId);
  }, [selectedStyleId]);

  const filteredStyles = useMemo(() => {
    const term = normalizeText(styleSearch);

    return sortByActive(styles).filter((style) => {
      if (!matchesStatusFilter(style.active, styleStatusFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        style.name,
        style.style_code,
        style.garment_type_name,
        style.fabric_name,
        style.target_name,
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(term);
    });
  }, [styleSearch, styleStatusFilter, styles]);

  useEffect(() => {
    if (!styles.length) {
      return;
    }

    const stillExists = styles.some((style) => style.style_id === selectedStyleId);

    if (!stillExists) {
      setSelectedStyleId(styles[0].style_id);
    }
  }, [selectedStyleId, styles]);

  const visibleSizes = useMemo(() => {
    const selectedIds = new Set(formState.sizeIds);

    return sizes.filter((size) => size.active || selectedIds.has(size.size_id));
  }, [formState.sizeIds, sizes]);

  const visibleColors = useMemo(() => {
    const selectedIds = new Set(formState.colorIds);

    return colors.filter((color) => color.active || selectedIds.has(color.color_id));
  }, [colors, formState.colorIds]);

  const filteredVariants = useMemo(() => {
    const variants = selectedSnapshot?.variants || [];
    const term = normalizeText(variantSearch);

    return sortByActive(variants).filter((variant) => {
      if (!matchesStatusFilter(variant.active, variantStatusFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        variant.sku,
        variant.size_code,
        variant.size_name,
        variant.color_code,
        variant.color_name,
        variant.barcode,
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(term);
    });
  }, [selectedSnapshot?.variants, variantSearch, variantStatusFilter]);

  const projectedColorsCount = formState.colorIds.length || 1;
  const projectedCombinations = formState.sizeIds.length * projectedColorsCount;
  const totalVariants = useMemo(
    () => styles.reduce((total, style) => total + style.expected_variant_count, 0),
    [styles]
  );

  const styleCounts = useMemo(
    () => ({
      all: styles.length,
      active: styles.filter((style) => style.active).length,
      inactive: styles.filter((style) => !style.active).length,
    }),
    [styles]
  );

  const variantCounts = useMemo(() => {
    const variants = selectedSnapshot?.variants || [];

    return {
      all: variants.length,
      active: variants.filter((variant) => variant.active).length,
      inactive: variants.filter((variant) => !variant.active).length,
    };
  }, [selectedSnapshot?.variants]);

  const selectedProduct = selectedWorkspace?.product || null;

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStyleId) {
      return;
    }

    setSavingConfig(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await requestApiData<VariantSnapshot>(`/api/variants/styles/${selectedStyleId}/config`, {
        method: "PUT",
        body: JSON.stringify({
          size_ids: formState.sizeIds,
          color_ids: formState.colorIds,
        }),
      });

      await loadStyleSnapshot(selectedStyleId);
      setSuccessMessage("Configuracion guardada correctamente.");
      await loadBaseData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar la configuracion"
      );
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleGenerateVariants() {
    if (!selectedStyleId) {
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await requestApiData<{
        created_count: number;
        existing_count: number;
        summary: VariantSnapshot["summary"];
      }>(`/api/variants/styles/${selectedStyleId}/generate`, {
        method: "POST",
      });

      await loadStyleSnapshot(selectedStyleId);
      await loadBaseData();
      setSuccessMessage(
        `Generacion completada. Se crearon ${result.created_count} variantes y ${result.existing_count} ya existian.`
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo generar variantes"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleVariantActive(variant: VariantItem) {
    setTogglingVariantId(variant.variant_id);
    setError(null);
    setSuccessMessage(null);

    try {
      await requestApiData<VariantItem>(`/api/variants/${variant.variant_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          active: !variant.active,
        }),
      });

      if (selectedStyleId) {
        await loadStyleSnapshot(selectedStyleId);
      }

      setSuccessMessage(
        variant.active
          ? "Variante inactivada correctamente."
          : "Variante activada correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado de la variante"
      );
    } finally {
      setTogglingVariantId(null);
    }
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                Productos
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                Variantes de producto
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Configura tallas y colores permitidos sobre un style existente y
                genera las variantes faltantes en lote. SKU se crea ahora; barcode
                queda pendiente para una etapa posterior.
              </p>
            </div>

            <button
              type="button"
              onClick={loadBaseData}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Styles disponibles
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{styles.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Variantes potenciales
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalVariants}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Faltantes del style
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {selectedSnapshot?.summary.missing_count ?? 0}
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Styles base
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Seleccionar style
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredStyles.length} visibles
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={styleSearch}
                  onChange={(event) => setStyleSearch(event.target.value)}
                  placeholder="Buscar por codigo, nombre o tela"
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Todos", count: styleCounts.all },
                  { key: "active", label: "Activos", count: styleCounts.active },
                  { key: "inactive", label: "Inactivos", count: styleCounts.inactive },
                ].map((option) => {
                  const isActive = styleStatusFilter === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setStyleStatusFilter(option.key as StatusFilter)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {option.label} ({option.count})
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando styles...
              </div>
            ) : filteredStyles.length ? (
              <div className="mt-4 space-y-3">
                {filteredStyles.map((style) => {
                  const isSelected = style.style_id === selectedStyleId;

                  return (
                    <button
                      key={style.style_id}
                      type="button"
                      onClick={() => {
                        setSelectedStyleId(style.style_id);
                        setSuccessMessage(null);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      } ${style.active ? "" : "opacity-70"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{style.name}</p>
                            {style.style_code ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {style.style_code}
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                style.status
                              )}`}
                            >
                              {getStatusLabel(style.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            {style.garment_type_name}
                            {style.fabric_name ? ` - ${style.fabric_name}` : ""}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Configuracion actual: {style.configured_size_count} tallas /{" "}
                            {style.configured_color_count} colores
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Variantes {style.variant_count}/{style.expected_variant_count} ·
                            retail {style.retail_sizes_covered_count}/{style.configured_size_count}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            style.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {style.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  No hay styles para este filtro
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ajusta la busqueda o el estado para ver otros styles base.
                </p>
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            {loadingSelected ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando configuracion...
              </div>
            ) : selectedSnapshot ? (
              <div className="space-y-5">
                <div
                  className={`rounded-3xl border border-slate-200 bg-slate-50 p-4 ${
                    selectedSnapshot.style.active ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-950">
                          {selectedSnapshot.style.name}
                        </h2>
                        {selectedSnapshot.style.style_code ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {selectedSnapshot.style.style_code}
                          </span>
                        ) : null}
                        {selectedProduct ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              selectedProduct.status
                            )}`}
                          >
                            {getStatusLabel(selectedProduct.status)}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            selectedSnapshot.style.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {selectedSnapshot.style.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-700">Tipo:</span>{" "}
                          {selectedSnapshot.style.garment_type_name}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Tela:</span>{" "}
                          {selectedSnapshot.style.fabric_name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Target:</span>{" "}
                          {selectedSnapshot.style.target_name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Variantes:</span>{" "}
                          {selectedSnapshot.summary.existing_count} /{" "}
                          {selectedSnapshot.summary.total_possible}
                        </p>
                        {selectedProduct ? (
                          <>
                            <p>
                              <span className="font-medium text-slate-700">Retail:</span>{" "}
                              {selectedProduct.retail_sizes_covered_count} /{" "}
                              {selectedProduct.configured_size_count}
                            </p>
                            <p>
                              <span className="font-medium text-slate-700">Mayorista:</span>{" "}
                              {selectedProduct.wholesale_sizes_covered_count} /{" "}
                              {selectedProduct.configured_size_count}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Shirt className="h-10 w-10 text-slate-300" />
                  </div>
                </div>

                {selectedProduct ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-4">
                          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Retail
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {selectedProduct.retail_sizes_covered_count}/
                              {selectedProduct.configured_size_count}
                            </p>
                          </article>
                          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Mayorista
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {selectedProduct.wholesale_sizes_covered_count}/
                              {selectedProduct.configured_size_count}
                            </p>
                          </article>
                          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Stock
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {selectedProduct.total_stock_qty}
                            </p>
                          </article>
                          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Siguiente paso
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {selectedProduct.next_step_label}
                            </p>
                          </article>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.missing_retail_size_count > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Faltan {selectedProduct.missing_retail_size_count} tallas retail
                            </span>
                          ) : null}
                          {selectedProduct.warnings.missing_wholesale_prices ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Mayorista incompleto
                            </span>
                          ) : null}
                          {selectedProduct.warnings.stock_without_retail_price ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Stock sin precio retail
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/precios/crear-y-editar-precio?style_id=${encodeURIComponent(selectedProduct.style_id)}`}
                          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Ir a precios
                        </Link>
                        <Link
                          href={`/precios/listado-de-precios?style_id=${encodeURIComponent(selectedProduct.style_id)}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Ver historial
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handleSaveConfig} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-700">Tallas</label>
                      <span className="text-xs text-slate-500">Obligatorio</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleSizes.map((size) => (
                        <label
                          key={size.size_id}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
                            size.active
                              ? "border-slate-200 bg-slate-50 text-slate-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formState.sizeIds.includes(size.size_id)}
                            onChange={() =>
                              setFormState((current) => ({
                                ...current,
                                sizeIds: toggleValue(current.sizeIds, size.size_id),
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            {size.code} - {size.name}
                            {!size.active ? " (inactiva)" : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-700">Colores</label>
                      <span className="text-xs text-slate-500">
                        Si no eliges uno, se usara UNICO
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleColors.map((color) => (
                        <label
                          key={color.color_id}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
                            color.active
                              ? "border-slate-200 bg-slate-50 text-slate-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formState.colorIds.includes(color.color_id)}
                            onChange={() =>
                              setFormState((current) => ({
                                ...current,
                                colorIds: toggleValue(current.colorIds, color.color_id),
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300"
                            style={{
                              backgroundColor: color.hex || "#ffffff",
                            }}
                          />
                          <span>
                            {color.code ? `${color.code} - ${color.name}` : color.name}
                            {!color.active ? " (inactivo)" : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tallas elegidas
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formState.sizeIds.length}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Colores elegidos
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formState.colorIds.length || 1}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Combinaciones proyectadas
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {projectedCombinations}
                      </p>
                    </article>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {successMessage ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {successMessage}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savingConfig ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar configuracion
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateVariants}
                      disabled={generating}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {generating ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <PackagePlus className="h-4 w-4" />
                          Generar variantes faltantes
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Resultado
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        Variantes generadas
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {filteredVariants.length} visibles
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={variantSearch}
                        onChange={(event) => setVariantSearch(event.target.value)}
                        placeholder="Buscar por SKU, talla o color"
                        className="w-full bg-transparent outline-none placeholder:text-slate-400"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "all", label: "Todos", count: variantCounts.all },
                        { key: "active", label: "Activos", count: variantCounts.active },
                        { key: "inactive", label: "Inactivos", count: variantCounts.inactive },
                      ].map((option) => {
                        const isActive = variantStatusFilter === option.key;

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setVariantStatusFilter(option.key as StatusFilter)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              isActive
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {option.label} ({option.count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredVariants.length ? (
                    <div className="mt-4 space-y-3">
                      {filteredVariants.map((variant) => (
                        <div
                          key={variant.variant_id}
                          className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
                            variant.active ? "" : "opacity-70"
                          }`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Boxes className="h-4 w-4 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-900">
                                  {variant.size_code} / {variant.color_code}
                                </p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    variant.active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {variant.active ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500">
                                {variant.size_name} - {variant.color_name}
                              </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                              <div className="grid gap-2 text-sm text-slate-500 md:text-right">
                                <p>
                                  <span className="font-medium text-slate-700">SKU:</span>{" "}
                                  {variant.sku}
                                </p>
                                <p>
                                  <span className="font-medium text-slate-700">Barcode:</span>{" "}
                                  {variant.barcode || "Pendiente"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleVariantActive(variant)}
                                disabled={togglingVariantId === variant.variant_id}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {togglingVariantId === variant.variant_id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : variant.active ? (
                                  "Inactivar"
                                ) : (
                                  "Activar"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-500">
                        No hay variantes para este filtro. Ajusta la busqueda o el
                        estado para revisar otros registros.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Selecciona un style
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Desde aqui definiras tallas, colores y la generacion de SKU por
                    combinacion.
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
