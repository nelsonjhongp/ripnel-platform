"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Eye,
  LoaderCircle,
  MapPin,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Search,
  SquareCheckBig,
  Trash2,
  X,
} from "lucide-react";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

type Location = {
  location_id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  active: boolean;
};

type AdjustmentStatus = "draft" | "confirmed" | "cancelled";

type AdjustmentSummary = {
  adjustment_id: string;
  adjustment_number: string;
  location_id: string;
  location_code: string;
  location_name: string;
  status: AdjustmentStatus;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  line_count: number;
};

type AdjustmentLine = {
  adjustment_line_id: string;
  adjustment_id: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
  counted_qty: number;
  difference_qty: number;
  notes: string | null;
};

type AdjustmentDetail = AdjustmentSummary & {
  lines: AdjustmentLine[];
};

type AdjustmentVariant = {
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  size_code: string;
  color_name: string;
  system_qty: number;
};

type DraftAdjustmentLine = AdjustmentVariant & {
  counted_qty: number;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload.data;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  return "Borrador";
}

function getStatusClasses(status: AdjustmentStatus) {
  if (status === "confirmed") {
    return "border-[color:color-mix(in_srgb,#10b981_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_82%,var(--ops-text))]";
  }

  if (status === "cancelled") {
    return "border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]";
  }

  return "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]";
}

function getDifferenceClasses(value: number) {
  if (value > 0) {
    return "text-[color:color-mix(in_srgb,#059669_88%,var(--ops-text))]";
  }

  if (value < 0) {
    return "text-[color:color-mix(in_srgb,#e11d48_88%,var(--ops-text))]";
  }

  return "text-[var(--ops-text-muted)]";
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
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]";

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
      <span className={cn("text-sm font-semibold tabular-nums", valueClass)}>
        {value}
      </span>
    </div>
  );
}

export function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [createLocationId, setCreateLocationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftAdjustmentLine[]>([]);
  const [variantQuery, setVariantQuery] = useState("");
  const [variantResults, setVariantResults] = useState<AdjustmentVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantSearchError, setVariantSearchError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdjustmentDetail | null>(null);
  const [confirmingAdjustment, setConfirmingAdjustment] = useState(false);
  const [cancellingAdjustment, setCancellingAdjustment] = useState(false);

  async function loadAdjustments() {
    setLoadingAdjustments(true);
    setError(null);

    try {
      const data = await requestJson<AdjustmentSummary[]>("/api/inventory/adjustments");
      setAdjustments(data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar ajustes"
      );
    } finally {
      setLoadingAdjustments(false);
    }
  }

  async function loadLocations() {
    setLoadingLocations(true);

    try {
      const data = await requestJson<Location[]>("/api/locations");
      setLocations((data || []).filter((location) => location.active));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar sedes"
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    void loadAdjustments();
    void loadLocations();
  }, []);

  useEffect(() => {
    if (!createOpen || !createLocationId) {
      setVariantResults([]);
      setVariantSearchError(null);
      setLoadingVariants(false);
      return;
    }

    const normalizedQuery = variantQuery.trim();

    if (normalizedQuery.length < 2) {
      setVariantResults([]);
      setVariantSearchError(null);
      setLoadingVariants(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingVariants(true);
      setVariantSearchError(null);

      try {
        const params = new URLSearchParams({
          location_id: createLocationId,
          query: normalizedQuery,
        });
        const data = await requestJson<AdjustmentVariant[]>(
          `/api/inventory/adjustment-variants?${params.toString()}`,
          { signal: controller.signal }
        );
        setVariantResults(data || []);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setVariantSearchError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo buscar variantes"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingVariants(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [createLocationId, createOpen, variantQuery]);

  const filteredAdjustments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adjustments.filter((adjustment) => {
      const matchesStatus =
        statusFilter === "all" || adjustment.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || adjustment.location_id === locationFilter;
      const matchesQuery =
        !normalizedQuery ||
        adjustment.adjustment_number.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_code.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_name.toLowerCase().includes(normalizedQuery) ||
        (adjustment.reason || "").toLowerCase().includes(normalizedQuery) ||
        (adjustment.created_by_name || "").toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesLocation && matchesQuery;
    });
  }, [adjustments, locationFilter, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, locationFilter]);

  const totals = useMemo(() => {
    return {
      total: adjustments.length,
      drafts: adjustments.filter((adjustment) => adjustment.status === "draft").length,
      confirmed: adjustments.filter((adjustment) => adjustment.status === "confirmed")
        .length,
    };
  }, [adjustments]);
  const totalPages = Math.max(1, Math.ceil(filteredAdjustments.length / 10));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * 10;
  const paginatedAdjustments = filteredAdjustments.slice(pageStart, pageStart + 10);
  const visibleFrom = filteredAdjustments.length ? pageStart + 1 : 0;
  const visibleTo = filteredAdjustments.length
    ? Math.min(pageStart + 10, filteredAdjustments.length)
    : 0;
  const hasActiveFilters =
    Boolean(query.trim()) || statusFilter !== "all" || locationFilter !== "all";

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const filteredVariantResults = useMemo(() => {
    return variantResults.filter(
      (variant) =>
        !draftLines.some((line) => line.variant_id === variant.variant_id)
    );
  }, [draftLines, variantResults]);

  function openCreateModal() {
    setCreateOpen(true);
    setCreateLocationId("");
    setCreateReason("");
    setCreateNotes("");
    setDraftLines([]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
    setLoadingVariants(false);
    setNotice(null);
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setCreateLocationId("");
    setCreateReason("");
    setCreateNotes("");
    setDraftLines([]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
    setLoadingVariants(false);
  }

  function addDraftLine(variant: AdjustmentVariant) {
    setDraftLines((current) => [
      ...current,
      {
        ...variant,
        counted_qty: variant.system_qty,
      },
    ]);
    setVariantQuery("");
    setVariantResults([]);
    setVariantSearchError(null);
  }

  function removeDraftLine(variantId: string) {
    setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
  }

  function updateCountedQty(variantId: string, rawValue: string) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) {
          return line;
        }

        const parsed = Number(rawValue);

        if (!Number.isInteger(parsed) || parsed < 0) {
          return {
            ...line,
            counted_qty: 0,
          };
        }

        return {
          ...line,
          counted_qty: parsed,
        };
      })
    );
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdjustment(true);
    setError(null);
    setNotice(null);

    try {
      if (!createLocationId) {
        throw new Error("Debes seleccionar una sede");
      }

      if (!draftLines.length) {
        throw new Error("Debes agregar al menos una variante");
      }

      await requestJson<AdjustmentDetail>("/api/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({
          location_id: createLocationId,
          reason: createReason.trim() || null,
          notes: createNotes.trim() || null,
          lines: draftLines.map((line) => ({
            variant_id: line.variant_id,
            counted_qty: line.counted_qty,
            notes: null,
          })),
        }),
      });

      closeCreateModal();
      setNotice("Ajuste guardado en borrador.");
      await loadAdjustments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el ajuste"
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  async function openDetail(adjustmentId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    try {
      const data = await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${adjustmentId}`
      );
      setDetail(data);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el detalle"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
  }

  async function confirmAdjustment() {
    if (!detail) {
      return;
    }

    setConfirmingAdjustment(true);
    setDetailError(null);
    setError(null);
    setNotice(null);

    try {
      await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${detail.adjustment_id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      closeDetail();
      setNotice("Ajuste confirmado y aplicado al inventario.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo confirmar el ajuste"
      );
    } finally {
      setConfirmingAdjustment(false);
    }
  }

  async function cancelAdjustment() {
    if (!detail) {
      return;
    }

    setCancellingAdjustment(true);
    setDetailError(null);
    setError(null);
    setNotice(null);

    try {
      await requestJson<AdjustmentDetail>(
        `/api/inventory/adjustments/${detail.adjustment_id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      closeDetail();
      setNotice("Ajuste cancelado.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cancelar el ajuste"
      );
    } finally {
      setCancellingAdjustment(false);
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Apertura y regularizacion"
            title="Ajustes de inventario"
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    void loadAdjustments();
                    void loadLocations();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  className="rounded-lg"
                  onClick={openCreateModal}
                >
                  <PackagePlus className="h-4 w-4" />
                  Nuevo ajuste
                </Button>
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <MetricPill label="Total" value={totals.total} />
            <MetricPill label="Borradores" value={totals.drafts} tone="warning" />
            <MetricPill label="Confirmados" value={totals.confirmed} tone="accent" />
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            <div className="grid gap-2.5 lg:grid-cols-[1.4fr_0.9fr_0.8fr_auto] lg:items-end">
              <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Buscar
                  </label>
                  <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                    <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por numero, sede, motivo o usuario"
                      className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                    />
                  </div>
                </div>

              <FilterDropdown
                  label="Sede"
                  value={locationFilter}
                  options={[{ value: "all", label: "Todas" }, ...locations.map((location) => ({
                    value: location.location_id,
                    label: `${location.code} - ${location.name}`,
                  }))]}
                  onChange={setLocationFilter}
                />

                <FilterDropdown
                  label="Estado"
                  value={statusFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "draft", label: "Borrador" },
                    { value: "confirmed", label: "Confirmado" },
                    { value: "cancelled", label: "Cancelado" },
                  ]}
                  onChange={(v) => setStatusFilter(v as "all" | AdjustmentStatus)}
                />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 self-start rounded-lg lg:self-end"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("all");
                      setLocationFilter("all");
                    }}
                    disabled={!hasActiveFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </div>

            {error ? (
              <InlineStatusCard
                title="No pudimos cargar ajustes"
                description={error}
                tone="danger"
                variant="ops"
              />
            ) : null}

            {notice ? (
              <InlineStatusCard
                title="Operacion completada"
                description={notice}
                tone="neutral"
                variant="ops"
              />
            ) : null}

            <div className="overflow-x-auto">
              <div className="min-w-[980px] border-y border-[var(--ops-border-strong)]">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Numero</th>
                      <th className="px-4 py-3">Sede</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3 text-right">Lineas</th>
                      <th className="px-4 py-3">Creado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loadingAdjustments || loadingLocations ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin align-middle" />
                          Cargando ajustes...
                        </td>
                      </tr>
                    ) : paginatedAdjustments.length ? (
                      paginatedAdjustments.map((adjustment) => (
                        <tr
                          key={adjustment.adjustment_id}
                          className="transition hover:bg-[var(--ops-surface-muted)]"
                        >
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <span className="text-sm font-semibold text-[var(--ops-text)]">
                              {adjustment.adjustment_number}
                            </span>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <div className="text-sm text-[var(--ops-text)]">
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                                {adjustment.location_name}
                              </span>
                              <p className="text-[11px] text-[var(--ops-text-muted)]">{adjustment.location_code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                adjustment.status
                              )}`}
                            >
                              {formatStatus(adjustment.status)}
                            </span>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <span className="truncate text-sm text-[var(--ops-text)] block max-w-[180px]">
                              {adjustment.reason || "Sin motivo"}
                            </span>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold text-[var(--ops-text)]">
                            {adjustment.line_count}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <div className="text-sm text-[var(--ops-text)]">
                              {formatDateTime(adjustment.created_at)}
                              <p className="text-[11px] text-[var(--ops-text-muted)]">
                                {adjustment.created_by_name || "Sistema"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => void openDetail(adjustment.adjustment_id)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          No hay ajustes para los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-[var(--ops-text-muted)]">
                {filteredAdjustments.length
                  ? `${visibleFrom}-${visibleTo} de ${filteredAdjustments.length}`
                  : "0 resultados"}
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                className="self-end md:self-auto"
              />
            </div>
          </div>
        </div>

        {createOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center ops-overlay-backdrop p-4">
            <div className="ops-overlay-panel max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--ops-text)]">Nuevo ajuste</h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    Crea un borrador de apertura, conteo o regularizacion.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={closeCreateModal}
                >
                  Cerrar
                </Button>
              </div>

              <form
                onSubmit={submitAdjustment}
                className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"
              >
                <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-[var(--ops-text)]">Sede</span>
                      <select
                        value={createLocationId}
                        onChange={(event) => {
                          setCreateLocationId(event.target.value);
                          setDraftLines([]);
                          setVariantQuery("");
                          setVariantResults([]);
                          setVariantSearchError(null);
                        }}
                        className="sales-field h-10 w-full cursor-pointer rounded-lg px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Selecciona una sede</option>
                        {locations.map((location) => (
                          <option key={location.location_id} value={location.location_id}>
                            {location.code} - {location.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-[var(--ops-text)]">Motivo</span>
                      <input
                        type="text"
                        value={createReason}
                        onChange={(event) => setCreateReason(event.target.value)}
                        placeholder="Apertura inicial, conteo, regularizacion..."
                        className="sales-field h-10 w-full rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm">
                    <span className="font-medium text-[var(--ops-text)]">Notas</span>
                    <textarea
                      value={createNotes}
                      onChange={(event) => setCreateNotes(event.target.value)}
                      rows={3}
                      placeholder="Detalle adicional del conteo o apertura"
                      className="sales-field w-full rounded-2xl px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <div className="mt-5 rounded-2xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] p-4">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">Buscar variantes</p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      El buscador usa la sede elegida y tambien devuelve variantes con
                      stock actual en cero.
                    </p>

                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                      <input
                        type="text"
                        value={variantQuery}
                        onChange={(event) => setVariantQuery(event.target.value)}
                        disabled={!createLocationId}
                        placeholder={
                          createLocationId
                            ? "Buscar por SKU, style, talla o color"
                            : "Primero selecciona una sede"
                        }
                        className="sales-field h-10 w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none disabled:opacity-50"
                      />
                    </div>

                    {variantSearchError ? (
                      <div className="mt-4 rounded-xl border border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]">
                        {variantSearchError}
                      </div>
                    ) : null}

                    {loadingVariants ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Buscando variantes...
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      {filteredVariantResults.map((variant) => (
                        <div
                          key={variant.variant_id}
                          className="grid gap-3 rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 md:grid-cols-[1fr_120px]"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {variant.style_name}
                            </p>
                            <p className="text-xs text-[var(--ops-text-muted)]">
                              {variant.sku} - {variant.style_code} - {variant.size_code} /{" "}
                              {variant.color_name}
                            </p>
                            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                              Sistema actual:{" "}
                              <span className="font-semibold text-[var(--ops-text)]">{variant.system_qty}</span>
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => addDraftLine(variant)}
                          >
                            <PackagePlus className="h-4 w-4" />
                            Agregar
                          </Button>
                        </div>
                      ))}

                      {!loadingVariants &&
                      createLocationId &&
                      variantQuery.trim().length >= 2 &&
                      !filteredVariantResults.length ? (
                        <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
                          No se encontraron variantes para esa busqueda.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ops-text)]">Lineas del ajuste</p>
                      <p className="text-sm text-[var(--ops-text-muted)]">
                        {draftLines.length} variantes agregadas
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-3 py-1.5 text-xs font-semibold text-[color:color-mix(in_srgb,#f59e0b_72%,var(--ops-text))]">
                      Draft
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {draftLines.map((line) => {
                      const difference = line.counted_qty - line.system_qty;

                      return (
                        <div
                          key={line.variant_id}
                          className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--ops-text)]">
                                {line.style_name}
                              </p>
                              <p className="text-xs text-[var(--ops-text-muted)]">
                                {line.sku} - {line.size_code} / {line.color_name}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="rounded-full text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_78%,var(--ops-text))]"
                              onClick={() => removeDraftLine(line.variant_id)}
                              aria-label="Quitar linea"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
                              Sistema:{" "}
                              <span className="font-semibold text-[var(--ops-text)]">{line.system_qty}</span>
                            </div>
                            <label className="space-y-1 text-sm">
                              <span className="font-medium text-[var(--ops-text)]">Conteo</span>
                              <input
                                type="number"
                                min={0}
                                value={line.counted_qty}
                                onChange={(event) =>
                                  updateCountedQty(line.variant_id, event.target.value)
                                }
                                className="sales-field h-10 w-full rounded-lg px-3 py-2 text-sm outline-none"
                              />
                            </label>
                            <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2 text-sm">
                              <span className="text-[var(--ops-text-muted)]">Diferencia: </span>
                              <span className={`font-semibold ${getDifferenceClasses(difference)}`}>
                                {difference > 0 ? "+" : ""}
                                {difference}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!draftLines.length ? (
                      <div className="ops-empty-state-compact rounded-xl px-4 py-8 text-center text-sm">
                        Aun no agregas variantes al ajuste.
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    variant="accent"
                    size="default"
                    className="mt-5 w-full rounded-lg"
                    disabled={savingAdjustment || !createLocationId || !draftLines.length}
                  >
                    {savingAdjustment ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4" />
                    )}
                    Guardar borrador
                  </Button>
                </article>
              </form>
            </div>
          </div>
        ) : null}

        {detailOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center ops-overlay-backdrop p-4">
            <div className="ops-overlay-panel max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--ops-text)]">Detalle de ajuste</h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    Revisa lineas, diferencias y confirma el documento cuando este listo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={closeDetail}
                >
                  Cerrar
                </Button>
              </div>

              {detailError ? (
                <div className="mt-5 rounded-xl border border-[color:color-mix(in_srgb,#e11d48_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#e11d48_8%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]">
                  {detailError}
                </div>
              ) : null}

              {detailLoading ? (
                <div className="ops-empty-state-compact mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-10 text-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Cargando detalle...
                </div>
              ) : detail ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Numero</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                        {detail.adjustment_number}
                      </p>
                    </article>
                    <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Sede</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                        {detail.location_name}
                      </p>
                      <p className="text-sm text-[var(--ops-text-muted)]">{detail.location_code}</p>
                    </article>
                    <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Estado</p>
                      <p className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                            detail.status
                          )}`}
                        >
                          {formatStatus(detail.status)}
                        </span>
                      </p>
                    </article>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">Cabecera</p>
                      <dl className="mt-3 space-y-2 text-sm text-[var(--ops-text-muted)]">
                        <div>
                          <dt className="font-medium text-[var(--ops-text)]">Motivo</dt>
                          <dd>{detail.reason || "Sin motivo"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-[var(--ops-text)]">Notas</dt>
                          <dd>{detail.notes || "Sin notas"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-[var(--ops-text)]">Creado</dt>
                          <dd>
                            {formatDateTime(detail.created_at)} -{" "}
                            {detail.created_by_name || "Sistema"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-[var(--ops-text)]">Confirmado</dt>
                          <dd>
                            {detail.confirmed_at
                              ? `${formatDateTime(detail.confirmed_at)} - ${
                                  detail.confirmed_by_name || "Sistema"
                                }`
                              : "Pendiente"}
                          </dd>
                        </div>
                      </dl>
                    </article>

                    <article className="rounded-2xl border border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] p-4">
                      <p className="text-sm font-semibold text-[var(--ripnel-accent-hover)]">Impacto esperado</p>
                      <p className="mt-2 text-sm text-[var(--ops-text)]">
                        Al confirmar, cada linea ajusta la cantidad final de la sede y
                        genera un movimiento <code>ADJUST</code> en kardex.
                      </p>
                    </article>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[580px] border-y border-[var(--ops-border-strong)]">
                      <table className="w-full border-collapse">
                        <thead className="bg-[var(--ops-surface-muted)]">
                          <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            <th className="px-4 py-3">Variante</th>
                            <th className="px-4 py-3 text-right">Sistema</th>
                            <th className="px-4 py-3 text-right">Conteo</th>
                            <th className="px-4 py-3 text-right">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                          {detail.lines.map((line) => (
                            <tr
                              key={line.adjustment_line_id}
                              className="transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              <td className="px-4 py-[var(--ops-row-py)]">
                                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">{line.style_name}</p>
                                <p className="truncate text-xs text-[var(--ops-text-muted)]">
                                  {line.sku} - {line.style_code} - {line.size_code} /{" "}
                                  {line.color_name}
                                </p>
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                                {line.system_qty}
                              </td>
                              <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold text-[var(--ops-text)]">
                                {line.counted_qty}
                              </td>
                              <td
                                className={`px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums ${getDifferenceClasses(
                                  line.difference_qty
                                )}`}
                              >
                                {line.difference_qty > 0 ? "+" : ""}
                                {line.difference_qty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={closeDetail}
                    >
                      Cerrar
                    </Button>
                    {detail.status === "draft" ? (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => void cancelAdjustment()}
                          disabled={confirmingAdjustment || cancellingAdjustment}
                        >
                          {cancellingAdjustment ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Cancelar ajuste
                        </Button>
                        <Button
                          type="button"
                          variant="accent"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => void confirmAdjustment()}
                          disabled={confirmingAdjustment || cancellingAdjustment}
                        >
                          {confirmingAdjustment ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <SquareCheckBig className="h-4 w-4" />
                          )}
                          Confirmar ajuste
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
    </section>
    </TooltipProvider>
  );
}
