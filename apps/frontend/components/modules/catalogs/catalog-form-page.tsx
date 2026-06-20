"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { fetchCatalogItems, createCatalogItem } from "@/lib/api-catalogs";
import { useApiGet } from "@/hooks/use-api-get";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, error: loadError, refetch } = useApiGet(
    () => fetchCatalogItems(endpoint),
    [endpoint]
  );
  const catalogItems = data ?? [];

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
      eyebrow="Catálogos"
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
            onClick={() => refetch()}
            className="inline-flex rounded-lg border border-[var(--ops-border-strong)] px-3 py-2 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
          >
            Reintentar carga
          </button>
        </div>
      ) : (
        <CatalogItemForm
          catalogItems={catalogItems}
          fields={fields}
          idKey="id"
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
