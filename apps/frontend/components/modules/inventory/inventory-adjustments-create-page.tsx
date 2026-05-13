"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, PackagePlus, Search, Trash2 } from "lucide-react";
import {
  AdminSelectMenu,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { appRoutes } from "@/lib/routes";
import {
  type AdjustmentDetail,
  type AdjustmentVariant,
  type DraftAdjustmentLine,
  type Location,
  requestAdjustmentJson,
} from "./inventory-adjustments-shared";

export function InventoryAdjustmentsCreatePage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLocationId, setCreateLocationId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftAdjustmentLine[]>([]);
  const [variantQuery, setVariantQuery] = useState("");
  const [variantResults, setVariantResults] = useState<AdjustmentVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantSearchError, setVariantSearchError] = useState<string | null>(null);

  async function loadLocations() {
    setLoadingLocations(true);

    try {
      const data = await requestAdjustmentJson<Location[]>("/api/locations");
      setLocations((data || []).filter((location) => location.active));
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error ? requestError.message : "No se pudieron cargar sedes"
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialLocationId = params.get("location_id");
    const initialQuery = params.get("query");

    if (initialLocationId) {
      setCreateLocationId(initialLocationId);
    }

    if (initialQuery) {
      setVariantQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (!createLocationId) {
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
        const data = await requestAdjustmentJson<AdjustmentVariant[]>(
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
  }, [createLocationId, variantQuery]);

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        value: location.location_id,
        label: `${location.code} - ${location.name}`,
        helper: location.type,
      })),
    [locations]
  );

  const filteredVariantResults = useMemo(
    () =>
      variantResults.filter(
        (variant) => !draftLines.some((line) => line.variant_id === variant.variant_id)
      ),
    [draftLines, variantResults]
  );

  const selectedCreateLocation = useMemo(
    () => locations.find((location) => location.location_id === createLocationId) ?? null,
    [createLocationId, locations]
  );

  const draftTotals = useMemo(
    () => ({
      lines: draftLines.length,
      difference: draftLines.reduce(
        (accumulator, line) => accumulator + (line.counted_qty - line.system_qty),
        0
      ),
    }),
    [draftLines]
  );

  function addDraftLine(variant: AdjustmentVariant) {
    setDraftLines((current) => [
      ...current,
      {
        ...variant,
        counted_qty: variant.system_qty,
      },
    ]);
    setCreateError(null);
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
          return { ...line, counted_qty: 0 };
        }

        return { ...line, counted_qty: parsed };
      })
    );
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdjustment(true);
    setCreateError(null);

    try {
      if (!createLocationId) {
        throw new Error("Debes seleccionar una sede");
      }

      if (!draftLines.length) {
        throw new Error("Debes agregar al menos una variante");
      }

      await requestAdjustmentJson<AdjustmentDetail>("/api/inventory/adjustments", {
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

      router.push(appRoutes.inventoryAdjustments);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el ajuste"
      );
    } finally {
      setSavingAdjustment(false);
    }
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow="Apertura y regularizacion"
        title="Nuevo ajuste"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
              <Link href={appRoutes.inventoryAdjustments}>
                <ArrowLeft className="h-4 w-4" />
                Volver a ajustes
              </Link>
            </Button>
            <Button
              type="submit"
              form="inventory-adjustment-create-form"
              variant="accent"
              size="sm"
              className="rounded-lg"
              disabled={savingAdjustment || !createLocationId || !draftLines.length}
            >
              {savingAdjustment ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="h-4 w-4" />
              )}
              Guardar borrador
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Lineas" value={draftTotals.lines} />
        <OpsMetricPill label="Diferencia" value={draftTotals.difference} tone="warning" />
      </div>

      <OpsSectionDivider>
        <form id="inventory-adjustment-create-form" onSubmit={submitAdjustment} className="space-y-4">
          {createError ? (
            <InlineStatusCard title="Error al crear ajuste" description={createError} tone="danger" variant="ops" />
          ) : null}

          <section className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
            <div className="grid gap-4 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Sede
                </label>
                <AdminSelectMenu
                  value={createLocationId}
                  onValueChange={setCreateLocationId}
                  placeholder="Selecciona una sede"
                  options={locationOptions}
                  disabled={loadingLocations}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Motivo
                </label>
                <input
                  type="text"
                  value={createReason}
                  onChange={(event) => setCreateReason(event.target.value)}
                  className="sales-field h-10 w-full rounded-lg px-3 text-sm"
                  placeholder="Motivo operativo del ajuste"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="inventory-adjustment-notes"
                  className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
                >
                  Notas
                </label>
                <AdminTextarea
                  id="inventory-adjustment-notes"
                  value={createNotes}
                  onChange={(event) => setCreateNotes(event.target.value)}
                  rows={3}
                  placeholder="Notas del conteo o contexto del ajuste"
                  className="min-h-[92px]"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
            <OpsTableBlock>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                    Variantes por contar
                  </h2>
                  <p className="text-xs text-[var(--ops-text-muted)]">
                    Busca por SKU, style, talla o color en la sede seleccionada.
                  </p>
                </div>
              </div>

              <section className="space-y-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Buscar variante
                  </label>
                  <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                    <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
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
                      className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)] disabled:opacity-50"
                    />
                  </div>
                </div>

                {selectedCreateLocation ? (
                  <p className="mt-3 text-xs text-[var(--ops-text-muted)]">
                    Sede activa:{" "}
                    <span className="font-semibold text-[var(--ops-text)]">
                      {selectedCreateLocation.code} - {selectedCreateLocation.name}
                    </span>
                  </p>
                ) : null}

                {variantSearchError ? (
                  <div className="mt-4">
                    <InlineStatusCard title="Error al buscar variantes" description={variantSearchError} tone="danger" variant="ops" />
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
                      className="grid gap-3 border-b border-[var(--ops-border-strong)] py-3 last:border-b-0 md:grid-cols-[1fr_120px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                          {variant.style_name}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                          {variant.sku}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                          {variant.style_code} · {variant.size_code} / {variant.color_name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                          Sistema actual:{" "}
                          <span className="font-semibold text-[var(--ops-text)]">
                            {variant.system_qty}
                          </span>
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
                      No se encontraron variantes para esa búsqueda.
                    </div>
                  ) : null}
                </div>
              </section>
            </OpsTableBlock>

            <OpsTableBlock>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                    Lineas del ajuste
                  </h2>
                  <p className="text-xs text-[var(--ops-text-muted)]">
                    Conteo físico antes de guardar el borrador.
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                  Draft
                </span>
              </div>

              <OpsTableWrap minWidth="680px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Variante</th>
                      <th className="px-4 py-3 text-right">Sistema</th>
                      <th className="px-4 py-3 text-right">Conteo</th>
                      <th className="px-4 py-3 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {draftLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          Aún no agregas variantes al ajuste.
                        </td>
                      </tr>
                    ) : (
                      draftLines.map((line) => (
                        <tr
                          key={line.variant_id}
                          className="transition hover:bg-[var(--ops-surface-muted)]"
                        >
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                              {line.style_name}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                              {line.sku}
                            </p>
                            <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                              {line.style_code} · {line.size_code} / {line.color_name}
                            </p>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text)]">
                            {line.system_qty}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <input
                              type="number"
                              min={0}
                              value={line.counted_qty}
                              onChange={(event) =>
                                updateCountedQty(line.variant_id, event.target.value)
                              }
                              className="sales-field h-9 w-24 rounded-lg px-2 py-1 text-center text-sm"
                            />
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeDraftLine(line.variant_id)}
                              className="rounded-lg text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                              aria-label="Quitar linea"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>
            </OpsTableBlock>
          </div>
        </form>
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
