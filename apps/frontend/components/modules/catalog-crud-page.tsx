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
import { InlineStatusCard } from "@/components/feedback/status-page";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
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
      <div className="mx-auto max-w-[1180px] space-y-4">
        <PosHeader
          eyebrow={eyebrow}
          title={title}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={loadItems}
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
              <Button asChild variant="accent" size="sm" className="rounded-lg">
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
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Buscar</label>
              <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, codigo o detalle" className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]" />
              </div>
            </div>

            <FilterDropdown
              label="Estado"
              value={statusFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ]}
              onChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1); }}
            />

            <TooltipProvider delayDuration={120}>
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
            <InlineStatusCard title="Error" description={error} tone="danger" variant="ops" />
          ) : null}

          {successMessage ? (
            <InlineStatusCard title="Éxito" description={successMessage} tone="neutral" variant="ops" />
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[920px] border-y border-[var(--ops-border-strong)]">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--ops-surface-muted)]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    <th className="px-4 py-3">Registro</th>
                    {listFields.map((field) => (
                      <th key={field.key} className="px-4 py-3">{field.label}</th>
                    ))}
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <tr>
                      <td colSpan={listFields.length + 3} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                        <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                        Cargando registros...
                      </td>
                    </tr>
                  ) : filteredItems.length ? (
                    paginatedItems.map((item, index) => (
                      <tr
                        key={String(item.code || item.name || index)}
                        className={`transition hover:bg-[var(--ops-surface-muted)] ${!item.active ? "opacity-80" : ""}`}
                      >
                        <td className="px-4 py-[var(--ops-row-py)]">
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
                        </td>
                        {listFields.map((field) => (
                          <td key={field.key} className="px-4 py-[var(--ops-row-py)]">
                            {field.render === "hex" ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex h-4 w-4 shrink-0 rounded-[4px] border border-[color:var(--ops-border-strong)]"
                                  style={{
                                    backgroundColor: String(item[field.key] || "transparent"),
                                  }}
                                  aria-hidden="true"
                                />
                                <span className="truncate text-sm">
                                  {formatValue(item[field.key])}
                                </span>
                              </div>
                            ) : (
                              <p className="truncate text-sm">
                                {formatValue(item[field.key])}
                              </p>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              item.active
                                ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
                                : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)]">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              asChild
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                            >
                              <Link href={`${catalogRoute}/${getItemId(item, idKey)}`}>
                                <PencilLine className="h-3.5 w-3.5" />
                                Editar
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant={item.active ? "outline" : "accent"}
                              size="sm"
                              className="rounded-lg"
                              onClick={() => handleToggleActive(item)}
                            >
                              {item.active ? "Inactivar" : "Activar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={listFields.length + 3} className="px-4 py-10 text-center">
                        <h2 className="ops-title text-lg font-semibold">
                          {items.length ? "No hay resultados para este filtro" : emptyTitle}
                        </h2>
                        <p className="ops-text-muted mt-2 text-sm leading-6">
                          {items.length
                            ? "Prueba con otro texto de busqueda o cambia el filtro."
                            : emptyDescription}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
