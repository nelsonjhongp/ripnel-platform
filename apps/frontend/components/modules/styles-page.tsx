"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Filter,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
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

type OptionItem = {
  [key: string]: unknown;
  active?: boolean;
  name?: string;
  code?: string | null;
};

type StyleItem = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_id: string;
  garment_type_name: string;
  fabric_id: string | null;
  fabric_name: string | null;
  fabric_detail_id: string | null;
  fabric_detail_name: string | null;
  target_id: string | null;
  target_name: string | null;
  size_codes: string[];
  color_codes: string[];
};

type FormState = {
  garment_type_id: string;
  fabric_id: string;
  fabric_detail_id: string;
  target_id: string;
  name: string;
  description: string;
  active: boolean;
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

const initialFormState: FormState = {
  garment_type_id: "",
  fabric_id: "",
  fabric_detail_id: "",
  target_id: "",
  name: "",
  description: "",
  active: true,
};

function getOptionId(item: OptionItem) {
  return String(
    item.garment_type_id ||
      item.fabric_id ||
      item.fabric_detail_id ||
      item.target_id ||
      ""
  );
}

function getOptionLabel(item: OptionItem) {
  return item.code ? `${String(item.code)} - ${String(item.name)}` : String(item.name || "");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    dateStyle: "short",
  });
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "success"
      ? "border-[color:color-mix(in_srgb,#10b981_32%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_12%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_78%,var(--ops-text))]"
      : tone === "warning"
      ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
      : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]";
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "success"
      ? "text-[color:color-mix(in_srgb,#059669_76%,var(--ops-text))]"
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

async function requestApiData(path: string) {
  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar estilos");
  }

  return payload.data || [];
}

async function requestStylesModuleData() {
  const [
    stylesData,
    garmentTypesData,
    fabricsData,
    fabricDetailsData,
    targetsData,
  ] = await Promise.all([
    requestApiData("/api/styles"),
    requestApiData("/api/garment-types"),
    requestApiData("/api/fabrics"),
    requestApiData("/api/fabric-details"),
    requestApiData("/api/targets"),
  ]);

  return {
    stylesData,
    garmentTypesData,
    fabricsData,
    fabricDetailsData,
    targetsData,
  };
}

export function StylesPage({
  initialStyleId = null,
}: {
  initialStyleId?: string | null;
}) {
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [garmentTypes, setGarmentTypes] = useState<OptionItem[]>([]);
  const [fabrics, setFabrics] = useState<OptionItem[]>([]);
  const [fabricDetails, setFabricDetails] = useState<OptionItem[]>([]);
  const [targets, setTargets] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const hasAppliedInitialSelection = useRef(false);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const {
        stylesData,
        garmentTypesData,
        fabricsData,
        fabricDetailsData,
        targetsData,
      } = await requestStylesModuleData();

      setStyles(stylesData);
      setGarmentTypes(garmentTypesData);
      setFabrics(fabricsData);
      setFabricDetails(fabricDetailsData);
      setTargets(targetsData);
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
    void loadData();
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

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

      return [
        style.name,
        style.style_code,
        style.garment_type_name,
        style.fabric_name,
        style.fabric_detail_name,
        style.target_name,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [search, statusFilter, styles]);

  const totalPages = Math.max(1, Math.ceil(filteredStyles.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const paginatedStyles = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredStyles.slice(start, start + PAGE_SIZE);
  }, [filteredStyles, safeCurrentPage]);

  const firstVisible =
    paginatedStyles.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const lastVisible = paginatedStyles.length === 0 ? 0 : firstVisible + paginatedStyles.length - 1;
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCurrentPage(1);
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
      garment_type_id: style.garment_type_id,
      fabric_id: style.fabric_id || "",
      fabric_detail_id: style.fabric_detail_id || "",
      target_id: style.target_id || "",
      name: style.name,
      description: style.description || "",
      active: style.active,
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleToggleActive(style: StyleItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl(`/api/styles/${style.style_id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !style.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el style");
      }

      updateStyleInList(payload.data);

      if (editingStyleId === style.style_id) {
        setFormState((current) => ({
          ...current,
          active: payload.data.active,
        }));
      }

      setSuccessMessage(
        payload.data.active
          ? "Style activado correctamente."
          : "Style inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el style"
      );
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
      const response = await fetch(buildApiUrl(`/api/styles/${editingStyleId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description.trim() || null,
          target_id: formState.target_id || null,
          active: formState.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el style");
      }

      updateStyleInList(payload.data);
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

  const selectedStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? "Todos";

  return (
    <TooltipProvider delayDuration={120}>
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Productos"
            title="Estilos de producto"
            actions={
              <>
                <Button asChild variant="accent" size="sm" className="rounded-full">
                  <Link href="/productos/nuevo">
                    <Plus className="h-4 w-4" />
                    Nuevo
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={loadData}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <MetricPill label="Styles base" value={styles.length} />
            <MetricPill label="Activos" value={activeCount} tone="success" />
            <MetricPill label="Inactivos" value={inactiveCount} tone="warning" />
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_auto] lg:items-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por style, codigo o catalogos"
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
                      <span className="flex-1">{selectedStatusLabel}</span>
                      <ChevronDown className="h-4 w-4 text-[var(--ops-text-muted)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={8}
                    className="min-w-[var(--radix-dropdown-menu-trigger-width)] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text)]"
                  >
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) =>
                        setStatusFilter(value as "all" | "active" | "inactive")
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
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
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1120px] border-y border-[var(--ops-border-strong)]">
                <div className="ops-surface-muted grid grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_0.82fr_0.82fr_0.72fr_1.22fr] gap-x-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                  <span>Style</span>
                  <span>Tipo</span>
                  <span>Tela</span>
                  <span>Detalle</span>
                  <span>Target</span>
                  <span>Config.</span>
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
                      {styles.length
                        ? "No se encontraron styles con los filtros aplicados."
                        : "Aun no hay styles registrados."}
                    </div>
                  ) : (
                    paginatedStyles.map((style) => (
                      <div
                        key={style.style_id}
                        className={cn(
                          "grid grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_0.82fr_0.82fr_0.72fr_1.22fr] gap-x-3 px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]",
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
                              {formatShortDate(style.created_at)}
                            </span>
                          </div>
                          {style.description ? (
                            <p className="mt-1 truncate text-[11px] text-[var(--ops-text-muted)]">
                              {style.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-sm text-[var(--ops-text)]">
                          {style.garment_type_name}
                        </div>
                        <div className="text-sm text-[var(--ops-text)]">
                          {style.fabric_name || "-"}
                        </div>
                        <div className="text-sm text-[var(--ops-text)]">
                          {style.fabric_detail_name || "-"}
                        </div>
                        <div className="text-sm text-[var(--ops-text)]">
                          {style.target_name || "-"}
                        </div>

                        <div className="text-sm text-[var(--ops-text)]">
                          <p>{style.size_codes.length} tallas</p>
                          <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">
                            {style.color_codes.length} colores
                          </p>
                        </div>

                        <div>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              style.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {style.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            onClick={() => handleEdit(style)}
                            variant="outline"
                            size="sm"
                            className="rounded-full px-3"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button asChild variant="outline" size="sm" className="rounded-full px-3">
                            <Link href={`/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`}>
                              Variantes
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="rounded-full px-3">
                            <Link href={`/precios/crear-y-editar-precio?style_id=${encodeURIComponent(style.style_id)}`}>
                              Precios
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleToggleActive(style)}
                            variant={style.active ? "outline" : "accent"}
                            size="sm"
                            className="rounded-full px-3"
                          >
                            {style.active ? "Inactivar" : "Activar"}
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
                    : `${firstVisible}-${lastVisible} de ${filteredStyles.length}`}
                </span>
                <Pagination
                  page={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="self-end md:self-auto"
                />
              </div>
            ) : null}
          </div>

          {editingStyleId ? (
            <article className="ops-surface rounded-lg border p-4 md:p-5">
              <div className="border-b border-[color:var(--ops-border-soft)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
                  Edicion segura
                </p>
                <h2 className="ops-title mt-1 text-lg font-semibold">Editar style</h2>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--ops-text)]">Nombre</label>
                  <Input
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Jogger - French Terry"
                    required
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--ops-text)]">Codigo</label>
                  <Input
                    value={styles.find((style) => style.style_id === editingStyleId)?.style_code || ""}
                    readOnly
                    className="h-10 rounded-lg bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--ops-text)]">
                      Tipo de prenda
                    </label>
                    <select
                      value={formState.garment_type_id}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          garment_type_id: event.target.value,
                        }))
                      }
                      disabled
                      className="ops-surface h-10 w-full cursor-not-allowed rounded-lg border px-3 text-sm text-[var(--ops-text-muted)] outline-none"
                    >
                      <option value="">Selecciona un tipo</option>
                      {garmentTypes.map((item) => (
                        <option key={getOptionId(item)} value={getOptionId(item)}>
                          {getOptionLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--ops-text)]">Tela</label>
                    <select
                      value={formState.fabric_id}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          fabric_id: event.target.value,
                        }))
                      }
                      disabled
                      className="ops-surface h-10 w-full cursor-not-allowed rounded-lg border px-3 text-sm text-[var(--ops-text-muted)] outline-none"
                    >
                      <option value="">Sin tela</option>
                      {fabrics.map((item) => (
                        <option key={getOptionId(item)} value={getOptionId(item)}>
                          {getOptionLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--ops-text)]">
                      Detalle de tela
                    </label>
                    <select
                      value={formState.fabric_detail_id}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          fabric_detail_id: event.target.value,
                        }))
                      }
                      disabled
                      className="ops-surface h-10 w-full cursor-not-allowed rounded-lg border px-3 text-sm text-[var(--ops-text-muted)] outline-none"
                    >
                      <option value="">Sin detalle</option>
                      {fabricDetails.map((item) => (
                        <option key={getOptionId(item)} value={getOptionId(item)}>
                          {getOptionLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--ops-text)]">Target</label>
                    <select
                      value={formState.target_id}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          target_id: event.target.value,
                        }))
                      }
                      className="ops-surface h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none"
                    >
                      <option value="">Sin target</option>
                      {targets.map((item) => (
                        <option key={getOptionId(item)} value={getOptionId(item)}>
                          {getOptionLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--ops-text)]">Descripcion</label>
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Notas internas del style"
                    className="ops-surface min-h-24 w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  />
                </div>

                <label className="ops-surface-muted flex items-center gap-3 rounded-lg border px-3 py-3 text-sm text-[var(--ops-text)]">
                  <input
                    type="checkbox"
                    checked={formState.active}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[var(--ops-border-strong)]"
                  />
                  Mantener style activo
                </label>

                {error ? (
                  <div role="alert" aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {successMessage ? (
                  <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-full" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="accent" className="rounded-full" disabled={submitting}>
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
                  </Button>
                </div>
              </form>
            </article>
          ) : null}
        </div>
      </section>
    </TooltipProvider>
  );
}
