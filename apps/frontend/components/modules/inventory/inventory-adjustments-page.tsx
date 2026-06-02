"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  LoaderCircle,
  MapPin,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  SquareCheckBig,
  X,
} from "lucide-react";
import {
  AdminInlineMessage,
  AdminConfirmModal,
  AdminModalShell,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/lib/routes";
import {
  type AdjustmentDetail,
  type AdjustmentDetailData,
  type AdjustmentListData,
  type AdjustmentStatus,
  type AdjustmentSummary,
  formatAdjustmentIntent,
  formatAdjustmentDateTime,
  formatAdjustmentStatus,
  getAdjustmentDifferenceClasses,
  getAdjustmentStatusClasses,
  requestAdjustmentJson,
  type Location,
  resolveAdjustmentIntent,
} from "./inventory-adjustments-shared";

function AdjustmentStatusChip({ status }: { status: AdjustmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        getAdjustmentStatusClasses(status)
      )}
    >
      {formatAdjustmentStatus(status)}
    </span>
  );
}

function AdjustmentIntentChip({
  adjustment,
}: {
  adjustment: { intent_type?: "opening" | "adjustment" | null; reason: string | null };
}) {
  const intent = resolveAdjustmentIntent(adjustment);
  const classes =
    intent === "opening"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"
      : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", classes)}>
      {formatAdjustmentIntent(intent)}
    </span>
  );
}

export function InventoryAdjustmentsPage() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<AdjustmentSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdjustmentStatus>("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdjustmentDetail | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [confirmingAdjustment, setConfirmingAdjustment] = useState(false);
  const [cancellingAdjustment, setCancellingAdjustment] = useState(false);
  const canManageAdjustments = ["ADMIN", "ALMACEN"].includes(
    String(user?.role_name || "").toUpperCase()
  );

  async function loadAdjustments() {
    setLoadingAdjustments(true);
    setError(null);

    try {
      const data = await requestAdjustmentJson<AdjustmentListData>("/api/inventory/adjustments");
      setAdjustments(data?.rows || []);
      setLocations(data?.meta.available_locations || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar ajustes"
      );
    } finally {
      setLoadingAdjustments(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadAdjustments();
    });
  }, []);
  const effectiveLocationFilter =
    locationFilter === "all" || locations.some((location) => location.location_id === locationFilter)
      ? locationFilter
      : "all";

  const filteredAdjustments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adjustments.filter((adjustment) => {
      const matchesStatus = statusFilter === "all" || adjustment.status === statusFilter;
      const matchesLocation =
        effectiveLocationFilter === "all" || adjustment.location_id === effectiveLocationFilter;
      const matchesQuery =
        !normalizedQuery ||
        adjustment.adjustment_number.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_code.toLowerCase().includes(normalizedQuery) ||
        adjustment.location_name.toLowerCase().includes(normalizedQuery) ||
        (adjustment.reason || "").toLowerCase().includes(normalizedQuery) ||
        (adjustment.created_by_name || "").toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesLocation && matchesQuery;
    });
  }, [adjustments, effectiveLocationFilter, query, statusFilter]);

  const totals = useMemo(
    () => ({
      total: adjustments.length,
      drafts: adjustments.filter((adjustment) => adjustment.status === "draft").length,
      confirmed: adjustments.filter((adjustment) => adjustment.status === "confirmed").length,
    }),
    [adjustments]
  );

  const totalPages = Math.max(1, Math.ceil(filteredAdjustments.length / 10));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * 10;
  const paginatedAdjustments = filteredAdjustments.slice(pageStart, pageStart + 10);
  const visibleFrom = filteredAdjustments.length ? pageStart + 1 : 0;
  const visibleTo = filteredAdjustments.length
    ? Math.min(pageStart + 10, filteredAdjustments.length)
    : 0;
  const hasActiveFilters =
    Boolean(query.trim()) || statusFilter !== "all" || effectiveLocationFilter !== "all";

  async function openDetail(adjustmentId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setConfirmModalOpen(false);
    setCancelModalOpen(false);

    try {
      const data = await requestAdjustmentJson<AdjustmentDetailData>(
        `/api/inventory/adjustments/${adjustmentId}`
      );
      setDetail(data.adjustment);
      setLocations(data.meta.available_locations || []);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el detalle"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
    setConfirmModalOpen(false);
    setCancelModalOpen(false);
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
      await requestAdjustmentJson<AdjustmentDetailData>(
        `/api/inventory/adjustments/${detail.adjustment_id}/confirm`,
        { method: "POST", body: JSON.stringify({}) }
      );

      setConfirmModalOpen(false);
      closeDetail();
      setNotice("Ajuste confirmado y aplicado al inventario.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error ? requestError.message : "No se pudo confirmar el ajuste"
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
      await requestAdjustmentJson<AdjustmentDetailData>(
        `/api/inventory/adjustments/${detail.adjustment_id}/cancel`,
        { method: "POST", body: JSON.stringify({}) }
      );

      setCancelModalOpen(false);
      closeDetail();
      setNotice("Ajuste cancelado.");
      await loadAdjustments();
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error ? requestError.message : "No se pudo cancelar el ajuste"
      );
    } finally {
      setCancellingAdjustment(false);
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      {!canManageAdjustments ? (
        <ForbiddenPage variant="ops" />
      ) : (
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Inventario"
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
              }}
            >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button asChild variant="accent" size="sm" className="rounded-lg">
                <Link href={`${appRoutes.inventoryAdjustments}/nuevo`}>
                  <PackagePlus className="h-4 w-4" />
                  Registrar ajuste de inventario
                </Link>
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <OpsMetricPill label="Total" value={totals.total} />
          <OpsMetricPill label="Borradores" value={totals.drafts} tone="warning" />
          <OpsMetricPill label="Confirmados" value={totals.confirmed} tone="accent" />
        </div>

        {notice ? (
            <AdminInlineMessage tone="success">{notice}</AdminInlineMessage>
          ) : null}

        <OpsSectionDivider>
          <OpsTableBlock>

          <OpsFiltersRow className="lg:grid-cols-[1.4fr_0.9fr_0.8fr_auto]">
            <OpsSearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Buscar por numero, sede, motivo o usuario"
              ariaLabel="Buscar ajustes de inventario"
            />

            <FilterDropdown
              label="Sede"
              value={effectiveLocationFilter}
              options={[
                { value: "all", label: "Todas" },
                ...locations.map((location) => ({
                  value: location.location_id,
                  label: `${location.code} - ${location.name}`,
                })),
              ]}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
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
              onChange={(value) => {
                setStatusFilter(value as "all" | AdjustmentStatus);
                setPage(1);
              }}
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
                    setPage(1);
                  }}
                  disabled={!hasActiveFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpiar filtros</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          <OpsTableWrap minWidth="980px">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--ops-surface-muted)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Intención</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Lineas</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loadingAdjustments ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                    >
                      <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin align-middle" />
                      Cargando ajustes...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6">
                      <InlineStatusCard
                        title="No pudimos cargar ajustes"
                        description={error}
                        tone="danger"
                        variant="ops"
                      />
                    </td>
                  </tr>
                ) : paginatedAdjustments.length ? (
                  paginatedAdjustments.map((adjustment) => (
                    <tr
                      key={adjustment.adjustment_id}
                      className="transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <span className="text-sm font-semibold text-[var(--ops-text)]">
                          {adjustment.adjustment_number}
                        </span>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <div className="text-sm text-[var(--ops-text)]">
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                            {adjustment.location_name}
                          </span>
                          <p className="text-[11px] text-[var(--ops-text-muted)]">
                            {adjustment.location_code}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <AdjustmentStatusChip status={adjustment.status} />
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <AdjustmentIntentChip adjustment={adjustment} />
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <span className="block max-w-[180px] truncate text-sm text-[var(--ops-text)]">
                          {adjustment.reason || "Sin motivo"}
                        </span>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top text-right text-sm font-semibold text-[var(--ops-text)]">
                        {adjustment.line_count}
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top">
                        <div className="text-sm text-[var(--ops-text)]">
                          {formatAdjustmentDateTime(adjustment.created_at)}
                          <p className="text-[11px] text-[var(--ops-text-muted)]">
                            {adjustment.created_by_name || "Sistema"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                        <AdminRowActionsMenu
                          ariaLabel={`Acciones para ${adjustment.adjustment_number}`}
                          items={[
                            {
                              label: "Ver detalle",
                              icon: <Eye className="h-4 w-4" />,
                              onSelect: () => void openDetail(adjustment.adjustment_id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                    >
                      No hay ajustes para los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </OpsTableWrap>

          <OpsTableFooter>
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
          </OpsTableFooter>
          </OpsTableBlock>
        </OpsSectionDivider>

        {detailOpen ? (
          <AdminModalShell
            title="Detalle del ajuste"
            onClose={closeDetail}
            widthClass="max-w-5xl"
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={closeDetail}
                >
                  Cerrar
                </Button>
                {detail?.status === "draft" ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setCancelModalOpen(true)}
                      disabled={detailLoading || confirmingAdjustment || cancellingAdjustment}
                    >
                      <X className="h-4 w-4" />
                      Cancelar ajuste
                    </Button>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={detailLoading || confirmingAdjustment || cancellingAdjustment}
                    >
                      <SquareCheckBig className="h-4 w-4" />
                      Confirmar ajuste
                    </Button>
                  </>
                ) : null}
                {detail?.status === "confirmed" ? (
                  <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
                    <Link
                      href={`${appRoutes.inventoryMovements}?query=${encodeURIComponent(detail.adjustment_id)}`}
                    >
                      <Eye className="h-4 w-4" />
                      Ver movimientos de stock
                    </Link>
                  </Button>
                ) : null}
              </div>
            }
          >
            {detailError ? <AdminInlineMessage tone="danger">{detailError}</AdminInlineMessage> : null}

            {detailLoading ? (
              <div className="ops-empty-state-compact flex items-center justify-center gap-2 rounded-xl px-4 py-10 text-sm">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Cargando detalle...
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <div className="grid gap-4 border-b border-[var(--ops-border-strong)] pb-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Numero
                    </p>
                    <p className="text-lg font-semibold text-[var(--ops-text)]">
                      {detail.adjustment_number}
                    </p>
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {detail.location_name} · {detail.location_code}
                    </p>
                  </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Estado
                      </p>
                      <AdjustmentStatusChip status={detail.status} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Intención
                      </p>
                      <AdjustmentIntentChip adjustment={detail} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Lineas
                    </p>
                    <p className="text-lg font-semibold text-[var(--ops-text)]">
                      {detail.lines.length}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                  <dl className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Motivo
                      </dt>
                      <dd className="mt-1 text-[var(--ops-text)]">
                        {detail.reason || "Sin motivo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Creado
                      </dt>
                      <dd className="mt-1 text-[var(--ops-text)]">
                        {formatAdjustmentDateTime(detail.created_at)}
                      </dd>
                      <dd className="text-[11px] text-[var(--ops-text-muted)]">
                        {detail.created_by_name || "Sistema"}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Notas
                      </dt>
                      <dd className="mt-1 text-[var(--ops-text)]">
                        {detail.notes || "Sin notas"}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Confirmado
                      </dt>
                      <dd className="mt-1 text-[var(--ops-text)]">
                        {detail.confirmed_at
                          ? formatAdjustmentDateTime(detail.confirmed_at)
                          : "Pendiente"}
                      </dd>
                      <dd className="text-[11px] text-[var(--ops-text-muted)]">
                        {detail.confirmed_at
                          ? detail.confirmed_by_name || "Sistema"
                          : "Sin aplicar"}
                      </dd>
                    </div>
                  </dl>

                  <AdminInlineMessage tone="warning">
                    Al confirmar, cada linea actualiza la cantidad final de la sede y registra un
                    movimiento <code>ADJUST</code> en movimientos de stock. No uses este flujo para
                    mover mercaderia entre sedes.
                  </AdminInlineMessage>
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
                              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                {line.style_name}
                              </p>
                              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                {line.sku}
                              </p>
                              <p className="truncate text-xs text-[var(--ops-text-muted)]">
                                {line.style_code} · {line.size_code} / {line.color_name}
                              </p>
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text-muted)]">
                              {line.system_qty}
                            </td>
                            <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold text-[var(--ops-text)]">
                              {line.counted_qty}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums",
                                getAdjustmentDifferenceClasses(line.difference_qty)
                              )}
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
              </div>
            ) : null}
          </AdminModalShell>
        ) : null}

        <AdminConfirmModal
          open={confirmModalOpen}
          title="Confirmar ajuste"
          description={
            detail ? (
              <>
                Se aplicará <strong>{detail.adjustment_number}</strong> sobre la sede{" "}
                <strong>{detail.location_name}</strong> y se generarán movimientos de stock.
              </>
            ) : (
              "Se aplicará el ajuste seleccionado."
            )
          }
          confirmLabel="Confirmar ajuste"
          confirmTone="accent"
          busy={confirmingAdjustment}
          onCancel={() => setConfirmModalOpen(false)}
          onConfirm={() => void confirmAdjustment()}
        />

        <AdminConfirmModal
          open={cancelModalOpen}
          title="Cancelar ajuste"
          description={
            detail ? (
              <>
                <strong>{detail.adjustment_number}</strong> quedará cancelado y ya no podrá
                confirmarse.
              </>
            ) : (
              "El ajuste seleccionado quedará cancelado."
            )
          }
          confirmLabel="Cancelar ajuste"
          confirmTone="danger"
          busy={cancellingAdjustment}
          onCancel={() => setCancelModalOpen(false)}
          onConfirm={() => void cancelAdjustment()}
        />
      </OpsPageShell>
      )}
    </TooltipProvider>
  );
}
