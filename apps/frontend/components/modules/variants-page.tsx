"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ChevronDown,
  CircleAlert,
  Filter,
  LoaderCircle,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shirt,
} from "lucide-react";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

type ProductsResponse = {
  items: StyleItem[];
};

type VariantFormState = {
  sizeIds: string[];
  colorIds: string[];
};

type StatusFilter = "all" | "active" | "inactive";

const STYLE_PAGE_SIZE = 10;
const VARIANT_PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

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
  const payload = await apiFetch<T | ApiEnvelope<T>>(path, {
    cache: "no-store",
    ...init,
  });

  return unwrapApiData(payload);
}

async function requestVariantsBaseData() {
  const [productsPayload, sizesData, colorsData] = await Promise.all([
    requestApiData<ProductsResponse>("/api/products?page=1&page_size=50"),
    requestApiData<SizeItem[]>("/api/sizes"),
    requestApiData<ColorItem[]>("/api/colors"),
  ]);
  const stylesData = productsPayload?.items || [];

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

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
      ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
      : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]";
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
      ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
      : "text-[var(--ops-text-muted)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className="text-base font-semibold leading-none text-[var(--ops-text)]">{value}</span>
    </div>
  );
}

export function VariantsPage({
  initialStyleId = null,
}: {
  initialStyleId?: string | null;
}) {
  const router = useRouter();
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [selectedSnapshot, setSelectedSnapshot] = useState<VariantSnapshot | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<ProductWorkspace | null>(null);
  const [formState, setFormState] = useState<VariantFormState>(initialFormState);
  const [styleSearch, setStyleSearch] = useState("");
  const [styleStatusFilter, setStyleStatusFilter] = useState<StatusFilter>("all");
  const [stylePage, setStylePage] = useState(1);
  const [variantSearch, setVariantSearch] = useState("");
  const [variantStatusFilter, setVariantStatusFilter] = useState<StatusFilter>("all");
  const [variantPage, setVariantPage] = useState(1);
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

      if (!selectedStyleId && initialStyleId && stylesData.length) {
        const preferredStyle =
          initialStyleId &&
          stylesData.find((style) => style.style_id === initialStyleId)?.style_id;

        setSelectedStyleId(preferredStyle || "");
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

        if (initialStyleId && stylesData.length) {
          const preferredStyle =
            initialStyleId &&
            stylesData.find((style) => style.style_id === initialStyleId)?.style_id;

          setSelectedStyleId((current) => current || preferredStyle || "");
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
      setVariantSearch("");
      setVariantStatusFilter("all");
      setVariantPage(1);
      return;
    }

    loadStyleSnapshot(selectedStyleId);
  }, [selectedStyleId]);

  useEffect(() => {
    setStylePage(1);
  }, [styleSearch, styleStatusFilter]);

  useEffect(() => {
    setVariantPage(1);
  }, [variantSearch, variantStatusFilter, selectedStyleId]);

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
    if (!selectedStyleId || !styles.length) {
      return;
    }

    const stillExists = styles.some((style) => style.style_id === selectedStyleId);

    if (!stillExists) {
      setSelectedStyleId("");
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

  const readyStylesCount = useMemo(
    () => styles.filter((style) => style.status === "ready").length,
    [styles]
  );

  const pendingStylesCount = useMemo(
    () =>
      styles.filter(
        (style) =>
          style.status === "draft" ||
          style.status === "pending_variants" ||
          style.status === "pending_prices" ||
          style.warnings.stock_without_retail_price
      ).length,
    [styles]
  );

  const styleTotalPages = Math.max(1, Math.ceil(filteredStyles.length / STYLE_PAGE_SIZE));
  const safeStylePage = Math.min(stylePage, styleTotalPages);

  useEffect(() => {
    if (stylePage !== safeStylePage) {
      setStylePage(safeStylePage);
    }
  }, [safeStylePage, stylePage]);

  const paginatedStyles = useMemo(() => {
    const start = (safeStylePage - 1) * STYLE_PAGE_SIZE;
    return filteredStyles.slice(start, start + STYLE_PAGE_SIZE);
  }, [filteredStyles, safeStylePage]);

  const styleFirstVisible =
    paginatedStyles.length === 0 ? 0 : (safeStylePage - 1) * STYLE_PAGE_SIZE + 1;
  const styleLastVisible =
    paginatedStyles.length === 0 ? 0 : styleFirstVisible + paginatedStyles.length - 1;

  const variantTotalPages = Math.max(1, Math.ceil(filteredVariants.length / VARIANT_PAGE_SIZE));
  const safeVariantPage = Math.min(variantPage, variantTotalPages);

  useEffect(() => {
    if (variantPage !== safeVariantPage) {
      setVariantPage(safeVariantPage);
    }
  }, [safeVariantPage, variantPage]);

  const paginatedVariants = useMemo(() => {
    const start = (safeVariantPage - 1) * VARIANT_PAGE_SIZE;
    return filteredVariants.slice(start, start + VARIANT_PAGE_SIZE);
  }, [filteredVariants, safeVariantPage]);

  const variantFirstVisible =
    paginatedVariants.length === 0 ? 0 : (safeVariantPage - 1) * VARIANT_PAGE_SIZE + 1;
  const variantLastVisible =
    paginatedVariants.length === 0 ? 0 : variantFirstVisible + paginatedVariants.length - 1;

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
    <TooltipProvider delayDuration={120}>
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Productos"
            title="Variantes de producto"
            actions={
              <>
                {selectedStyleId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setSelectedStyleId("");
                      router.push("/productos/variantes");
                    }}
                  >
                    Volver a variantes
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={loadBaseData}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <MetricPill label="Styles base" value={styles.length} />
            <MetricPill label="Listos" value={readyStylesCount} tone="accent" />
            <MetricPill label="Por completar" value={pendingStylesCount} tone="warning" />
          </div>

          <div className="space-y-5">
            {!selectedStyleId ? (
              <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
                <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_auto] lg:items-end">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                    <Input
                      value={styleSearch}
                      onChange={(event) => setStyleSearch(event.target.value)}
                      placeholder="Buscar por codigo, nombre o tela"
                      className="h-10 rounded-lg pl-9"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Estado
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="ops-surface flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border px-3 text-left text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                        >
                          <Filter className="h-4 w-4 text-[var(--ops-text-muted)]" />
                          <span className="flex-1">
                            {STATUS_FILTER_OPTIONS.find((option) => option.value === styleStatusFilter)?.label ?? "Todos"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-[var(--ops-text-muted)]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        sideOffset={8}
                        className="min-w-[var(--radix-dropdown-menu-trigger-width)] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text)]"
                      >
                        <DropdownMenuRadioGroup
                          value={styleStatusFilter}
                          onValueChange={(value) => setStyleStatusFilter(value as StatusFilter)}
                        >
                          {STATUS_FILTER_OPTIONS.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        onClick={() => {
                          setStyleSearch("");
                          setStyleStatusFilter("all");
                          setStylePage(1);
                        }}
                        disabled={!styleSearch.trim() && styleStatusFilter === "all"}
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
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[1120px] border-y border-[var(--ops-border-strong)]">
                    <div className="ops-surface-muted grid grid-cols-[1.18fr_0.84fr_0.9fr_0.9fr_0.9fr_0.78fr_0.72fr_0.86fr] gap-x-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                      <span>Style</span>
                      <span>Tipo</span>
                      <span>Tela</span>
                      <span>Target</span>
                      <span>Config.</span>
                      <span>Cobertura</span>
                      <span>Estado</span>
                      <span>Acciones</span>
                    </div>

                    <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                      {loading ? (
                        <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                          Cargando styles...
                        </div>
                      ) : paginatedStyles.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          No hay styles para este filtro.
                        </div>
                      ) : (
                        paginatedStyles.map((style) => (
                          <div
                            key={style.style_id}
                            className={cn(
                              "grid grid-cols-[1.18fr_0.84fr_0.9fr_0.9fr_0.9fr_0.78fr_0.72fr_0.86fr] gap-x-3 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]",
                              !style.active && "opacity-75"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                {style.name}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                  {style.style_code || "Sin codigo"}
                                </span>
                                <span className="text-[11px] text-[var(--ops-text-muted)]">
                                  {new Date(style.created_at).toLocaleDateString("es-PE")}
                                </span>
                              </div>
                            </div>

                            <div className="text-sm text-[var(--ops-text)]">{style.garment_type_name}</div>
                            <div className="text-sm text-[var(--ops-text)]">{style.fabric_name || "-"}</div>
                            <div className="text-sm text-[var(--ops-text)]">{style.target_name || "-"}</div>

                            <div className="text-sm text-[var(--ops-text)]">
                              <p>{style.configured_size_count} tallas</p>
                              <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                                {style.configured_color_count} colores
                              </p>
                            </div>

                            <div className="text-sm text-[var(--ops-text)]">
                              <p>
                                {style.variant_count}/{style.expected_variant_count}
                              </p>
                              <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                                retail {style.retail_sizes_covered_count}/{style.configured_size_count}
                              </p>
                            </div>

                            <div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                  style.status
                                )}`}
                              >
                                {getStatusLabel(style.status)}
                              </span>
                            </div>

                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full px-3"
                                onClick={() => {
                                  setSelectedStyleId(style.style_id);
                                  router.push(`/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`);
                                  setSuccessMessage(null);
                                }}
                              >
                                Configurar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {!loading ? (
                  <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                    <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                      {filteredStyles.length === 0
                        ? "0 resultados"
                        : `${styleFirstVisible}-${styleLastVisible} de ${filteredStyles.length}`}
                    </span>
                    <Pagination
                      page={safeStylePage}
                      totalPages={styleTotalPages}
                      onPageChange={setStylePage}
                      className="self-end md:self-auto"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedStyleId ? (
              <article className="ops-surface rounded-lg border p-4 md:p-5">
                {loadingSelected ? (
                  <div className="ops-text-muted flex min-h-56 items-center justify-center">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Cargando configuracion...
                  </div>
                ) : selectedSnapshot ? (
                  <div className="space-y-5">
                <div
                  className={`ops-surface-muted rounded-lg border p-4 ${
                    selectedSnapshot.style.active ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="ops-title text-xl font-semibold">
                          {selectedSnapshot.style.name}
                        </h2>
                        {selectedSnapshot.style.style_code ? (
                          <span className="ops-surface rounded-full border border-[color:var(--ops-border-soft)] px-3 py-1 text-xs font-semibold text-[var(--ops-text-muted)]">
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
                      <div className="ops-text-muted mt-3 grid gap-2 text-sm md:grid-cols-2">
                        <p>
                          <span className="font-medium text-[var(--ops-text)]">Tipo:</span>{" "}
                          {selectedSnapshot.style.garment_type_name}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--ops-text)]">Tela:</span>{" "}
                          {selectedSnapshot.style.fabric_name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--ops-text)]">Target:</span>{" "}
                          {selectedSnapshot.style.target_name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--ops-text)]">Variantes:</span>{" "}
                          {selectedSnapshot.summary.existing_count} /{" "}
                          {selectedSnapshot.summary.total_possible}
                        </p>
                        {selectedProduct ? (
                          <>
                            <p>
                              <span className="font-medium text-[var(--ops-text)]">Retail:</span>{" "}
                              {selectedProduct.retail_sizes_covered_count} /{" "}
                              {selectedProduct.configured_size_count}
                            </p>
                            <p>
                              <span className="font-medium text-[var(--ops-text)]">Mayorista:</span>{" "}
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
                  <div className="ops-surface rounded-lg border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-4">
                          <article className="ops-surface-muted rounded-lg border p-3">
                            <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Retail
                            </p>
                            <p className="ops-title mt-1 text-lg font-semibold">
                              {selectedProduct.retail_sizes_covered_count}/
                              {selectedProduct.configured_size_count}
                            </p>
                          </article>
                          <article className="ops-surface-muted rounded-lg border p-3">
                            <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Mayorista
                            </p>
                            <p className="ops-title mt-1 text-lg font-semibold">
                              {selectedProduct.wholesale_sizes_covered_count}/
                              {selectedProduct.configured_size_count}
                            </p>
                          </article>
                          <article className="ops-surface-muted rounded-lg border p-3">
                            <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Stock
                            </p>
                            <p className="ops-title mt-1 text-lg font-semibold">
                              {selectedProduct.total_stock_qty}
                            </p>
                          </article>
                          <article className="ops-surface-muted rounded-lg border p-3">
                            <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                              Siguiente paso
                            </p>
                            <p className="ops-title mt-1 text-sm font-semibold">
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

                <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
                  <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_auto] lg:items-end">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                      <Input
                        value={variantSearch}
                        onChange={(event) => setVariantSearch(event.target.value)}
                        placeholder="Buscar por SKU, talla o color"
                        className="h-10 rounded-lg pl-9"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Estado
                      </label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="ops-surface flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border px-3 text-left text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                          >
                            <Filter className="h-4 w-4 text-[var(--ops-text-muted)]" />
                            <span className="flex-1">
                              {STATUS_FILTER_OPTIONS.find((option) => option.value === variantStatusFilter)?.label ?? "Todos"}
                            </span>
                            <ChevronDown className="h-4 w-4 text-[var(--ops-text-muted)]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={8}
                          className="min-w-[var(--radix-dropdown-menu-trigger-width)] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text)]"
                        >
                          <DropdownMenuRadioGroup
                            value={variantStatusFilter}
                            onValueChange={(value) => setVariantStatusFilter(value as StatusFilter)}
                          >
                            {STATUS_FILTER_OPTIONS.map((option) => (
                              <DropdownMenuRadioItem
                                key={option.value}
                                value={option.value}
                                className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
                              >
                                {option.label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => {
                            setVariantSearch("");
                            setVariantStatusFilter("all");
                            setVariantPage(1);
                          }}
                          disabled={!variantSearch.trim() && variantStatusFilter === "all"}
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
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[980px] border-y border-[var(--ops-border-strong)]">
                      <div className="ops-surface-muted grid grid-cols-[0.9fr_1fr_1fr_0.92fr_0.72fr_0.8fr] gap-x-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        <span>Variante</span>
                        <span>Detalle</span>
                        <span>SKU</span>
                        <span>Barcode</span>
                        <span>Estado</span>
                        <span>Acciones</span>
                      </div>

                      <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {paginatedVariants.length === 0 ? (
                          <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                            No hay variantes para este filtro.
                          </div>
                        ) : (
                          paginatedVariants.map((variant) => (
                            <div
                              key={variant.variant_id}
                              className={cn(
                                "grid grid-cols-[0.9fr_1fr_1fr_0.92fr_0.72fr_0.8fr] gap-x-3 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]",
                                !variant.active && "opacity-70"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Boxes className="h-4 w-4 text-[var(--ops-text-muted)]" />
                                  <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                    {variant.size_code} / {variant.color_code}
                                  </p>
                                </div>
                              </div>

                              <div className="text-sm text-[var(--ops-text)]">
                                <p>{variant.size_name}</p>
                                <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                                  {variant.color_name}
                                </p>
                              </div>

                              <div className="text-sm text-[var(--ops-text)]">{variant.sku}</div>
                              <div className="text-sm text-[var(--ops-text)]">{variant.barcode || "Pendiente"}</div>

                              <div>
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                    variant.active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  )}
                                >
                                  {variant.active ? "Activa" : "Inactiva"}
                                </span>
                              </div>

                              <div className="flex items-center justify-end">
                                <Button
                                  type="button"
                                  onClick={() => handleToggleVariantActive(variant)}
                                  disabled={togglingVariantId === variant.variant_id}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-3"
                                >
                                  {togglingVariantId === variant.variant_id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : variant.active ? (
                                    "Inactivar"
                                  ) : (
                                    "Activar"
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
                    <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                      {filteredVariants.length === 0
                        ? "0 resultados"
                        : `${variantFirstVisible}-${variantLastVisible} de ${filteredVariants.length}`}
                    </span>
                    <Pagination
                      page={safeVariantPage}
                      totalPages={variantTotalPages}
                      onPageChange={setVariantPage}
                      className="self-end md:self-auto"
                    />
                  </div>
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
            ) : null}
        </div>
      </div>
      </section>
    </TooltipProvider>
  );
}
