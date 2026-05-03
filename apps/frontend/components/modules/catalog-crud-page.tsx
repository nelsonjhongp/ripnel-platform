"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CatalogListFieldConfig } from "@/lib/product-master-metadata";

type CatalogCrudPageProps = {
  eyebrow: string;
  title: string;
  endpoint: string;
  emptyTitle: string;
  emptyDescription: string;
  listFields: CatalogListFieldConfig[];
  idKey: string;
  catalogRoute: string;
};

type CatalogItem = {
  [key: string]: unknown;
  active?: boolean;
  name?: string;
  code?: string | null;
  created_at?: string;
};

const PAGE_SIZE = 10;

function formatValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function getItemId(item: CatalogItem, idKey: string) {
  return String(item[idKey] || "");
}

async function requestCatalogItems(endpoint: string) {
  const response = await fetch(buildApiUrl(endpoint), {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar el catalogo");
  }

  return payload.data || [];
}

export function CatalogCrudPage({
  eyebrow,
  title,
  endpoint,
  emptyTitle,
  emptyDescription,
  listFields,
  idKey,
  catalogRoute,
}: CatalogCrudPageProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await requestCatalogItems(endpoint));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el catalogo"
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.active) ||
        (statusFilter === "inactive" && !item.active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [item.name, item.code, ...listFields.map((field) => item[field.key])]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [items, listFields, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleFrom = filteredItems.length ? pageStart + 1 : 0;
  const visibleTo = filteredItems.length
    ? Math.min(pageStart + PAGE_SIZE, filteredItems.length)
    : 0;
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  function updateItemInList(nextItem: CatalogItem) {
    setItems((current) =>
      current.map((item) =>
        getItemId(item, idKey) === getItemId(nextItem, idKey) ? nextItem : item
      )
    );
  }

  async function handleToggleActive(item: CatalogItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl(`${endpoint}/${getItemId(item, idKey)}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !item.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el estado");
      }

      updateItemInList(payload.data);
      setSuccessMessage(
        payload.data.active ? "Registro activado correctamente." : "Registro inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado"
      );
    }
  }

  return (
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <PosHeader
          eyebrow={eyebrow}
          title={title}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={loadItems}
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button asChild variant="accent" size="sm" className="rounded-full">
                <Link href={`${catalogRoute}/nuevo`}>
                  <Plus className="h-4 w-4" />
                  Nuevo registro
                </Link>
              </Button>
            </div>
          }
        />

        <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
          <div className="grid gap-2.5 lg:grid-cols-[1.45fr_0.84fr_auto] lg:items-end">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, codigo o detalle"
                className="ops-surface h-10 rounded-lg border py-2 pl-9 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "active" | "inactive")
                }
                className="ops-surface h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none transition hover:bg-[var(--ops-surface-muted)]"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 self-start rounded-lg lg:self-end"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    disabled={!hasActiveFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {successMessage}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[920px] border-y border-[var(--ops-border-strong)]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_0.8fr_150px] gap-3 bg-[var(--ops-surface-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                <div>Registro</div>
                <div>Detalle</div>
                <div>Estado</div>
                <div className="text-right">Acciones</div>
              </div>

              <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                {loading ? (
                  <div className="ops-text-muted flex min-h-56 items-center justify-center px-4 py-10 text-sm">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Cargando registros...
                  </div>
                ) : filteredItems.length ? (
                  paginatedItems.map((item, index) => (
                    <article
                      key={String(item.code || item.name || index)}
                      className={`px-4 py-[var(--ops-row-py)] transition-colors hover:bg-[var(--ops-surface-muted)] ${
                        item.active ? "" : "opacity-80"
                      }`}
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_0.8fr_150px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="ops-title truncate text-sm font-semibold">
                              {formatValue(item.name)}
                            </p>
                            {"code" in item && item.code ? (
                              <span className="ops-metric-pill inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                {String(item.code)}
                              </span>
                            ) : null}
                          </div>
                          {item.created_at ? (
                            <p className="ops-text-muted mt-1 text-[11px]">
                              {new Date(String(item.created_at)).toLocaleDateString("es-PE")}
                            </p>
                          ) : null}
                        </div>

                        <div className="ops-text-muted grid gap-1 text-sm">
                          {listFields.length ? (
                            listFields.map((field) =>
                              field.render === "hex" ? (
                                <div key={field.key} className="flex items-center gap-2">
                                  <span
                                    className="inline-flex h-4 w-4 shrink-0 rounded-[4px] border border-[color:var(--ops-border-strong)]"
                                    style={{
                                      backgroundColor: String(item[field.key] || "transparent"),
                                    }}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    <span className="font-medium text-[var(--ops-text)]">
                                      {field.label}:
                                    </span>{" "}
                                    {formatValue(item[field.key])}
                                  </span>
                                </div>
                              ) : (
                                <p key={field.key} className="truncate">
                                  <span className="font-medium text-[var(--ops-text)]">
                                    {field.label}:
                                  </span>{" "}
                                  {formatValue(item[field.key])}
                                </p>
                              )
                            )
                          ) : (
                            <p className="text-sm">Sin detalle adicional.</p>
                          )}
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              item.active
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : "border border-[color:var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="xs"
                            className="rounded-full"
                          >
                            <Link href={`${catalogRoute}/${getItemId(item, idKey)}`}>
                              <PencilLine className="h-3.5 w-3.5" />
                              Editar
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant={item.active ? "outline" : "accent"}
                            size="xs"
                            className="rounded-full"
                            onClick={() => handleToggleActive(item)}
                          >
                            {item.active ? "Inactivar" : "Activar"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center">
                    <h2 className="ops-title text-lg font-semibold">
                      {items.length ? "No hay resultados para este filtro" : emptyTitle}
                    </h2>
                    <p className="ops-text-muted mt-2 text-sm leading-6">
                      {items.length
                        ? "Prueba con otro texto de busqueda o cambia el filtro."
                        : emptyDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
            <span className="ops-secondary-text text-[var(--ops-text-muted)]">
              {filteredItems.length ? `${visibleFrom}-${visibleTo} de ${filteredItems.length}` : "0 resultados"}
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
    </section>
  );
}
