"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { fetchCatalogItems, createCatalogItem } from "@/lib/api-catalogs";
import type { CatalogRecord } from "@/lib/api-catalogs";
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell";
import { AdminInlineMessage } from "@/components/admin/admin-ui";
import { CatalogItemForm, buildInitialState } from "./catalog-item-form";
import type { CatalogFieldConfig } from "@/lib/product-master-metadata";

type CatalogFormPageProps = {
  catalogLabel: string;
  catalogRoute: string;
  endpoint: string;
  fields: CatalogFieldConfig[];
  duplicateStrategy: "name" | "name+code";
};

export function CatalogFormPage({
  catalogLabel,
  catalogRoute,
  endpoint,
  fields,
  duplicateStrategy,
}: CatalogFormPageProps) {
  const router = useRouter();
  const [items, setItems] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await fetchCatalogItems(endpoint);
        if (!cancelled) {
          setItems(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudo cargar el catalogo"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [endpoint, requestVersion]);

  async function handleSubmit(body: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);

    try {
      await createCatalogItem(endpoint, body);
      router.push(catalogRoute);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el registro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reloadItems() {
    setRequestVersion((current) => current + 1);
  }

  const readOnlyFieldKeys = fields
    .filter((field) => field.editableOnUpdate === false)
    .map((field) => field.key);

  return (
    <AdminFormPageShell
      eyebrow="Catalogos"
      title={`Nuevo ${catalogLabel.toLowerCase()}`}
      backHref={catalogRoute}
    >
      {loading ? (
        <div className="flex min-h-40 items-center justify-center text-sm text-[var(--ops-text-muted)]">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          Cargando formulario...
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <AdminInlineMessage tone="danger">{loadError}</AdminInlineMessage>
          <button
            type="button"
            onClick={reloadItems}
            className="inline-flex rounded-lg border border-[var(--ops-border-strong)] px-3 py-2 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
          >
            Reintentar carga
          </button>
        </div>
      ) : (
        <CatalogItemForm
          catalogItems={items}
          fields={fields}
          idKey=""
          duplicateStrategy={duplicateStrategy}
          mode="create"
          initialValues={buildInitialState(fields)}
          readOnlyFieldKeys={readOnlyFieldKeys}
          submitting={submitting}
          error={error}
          successMessage={null}
          onSubmit={handleSubmit}
          cancelHref={catalogRoute}
        />
      )}
    </AdminFormPageShell>
  );
}
