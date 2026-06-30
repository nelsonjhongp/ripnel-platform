"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { fetchCatalogItems, createCatalogItem } from "@/lib/api-catalogs";
import { useApiGet } from "@/hooks/use-api-get";
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell";
import { Button } from "@/components/ui/button";
import { CatalogItemForm, buildInitialState } from "./catalog-item-form";
import type { CatalogFieldConfig } from "@/lib/product-master-metadata";
import { CAT } from "./catalogs-messages";

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
          : CAT.formPage.errorCreate
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
      eyebrow={CAT.hub.eyebrow}
      title={`${CAT.crud.createTitle} ${catalogLabel.toLowerCase()}`}
      backHref={catalogRoute}
    >
      {loading ? (
        <div className="flex min-h-40 items-center justify-center text-sm text-[var(--ops-text-muted)]">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          {CAT.formPage.loadingForm}
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--ops-tone-danger-text)]">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => refetch()}
          >
            {CAT.formPage.retry}
          </Button>
        </div>
      ) : (
        <CatalogItemForm
          catalogItems={catalogItems}
          fields={fields}
          idKey=""
          duplicateStrategy={duplicateStrategy}
          mode="create"
          initialValues={buildInitialState(fields)}
          readOnlyFieldKeys={readOnlyFieldKeys}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => router.push(catalogRoute)}
        />
      )}
    </AdminFormPageShell>
  );
}
