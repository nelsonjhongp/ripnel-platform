"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { fetchCatalogItems, createCatalogItem } from "@/lib/api-catalogs";
import type { CatalogRecord } from "@/lib/api-catalogs";
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell";
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

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    fetchCatalogItems(endpoint)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudo cargar el catalogo"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
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
