"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpsSelect } from "@/components/ui/ops-selection";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import type { CatalogItem } from "@/types/products";
import { PRODUCTS } from "./products-messages";
import { DUPLICATE_WARNING_TEXT, opsInputCompact } from "./products-constants";
import {
  buildProductNameDuplicateIndex,
  findDuplicateProductName,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
} from "./products-utils";

type ExistingStyle = {
  style_id: string;
  name: string;
  style_code: string | null;
};

type CreatedStyle = {
  style_id: string;
  style_code: string | null;
  name: string;
};

type FormState = {
  name: string;
  garment_type_id: string;
  description: string;
};

const initialFormState: FormState = {
  name: "",
  garment_type_id: "",
  description: "",
};

function getItemId(item: CatalogItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value) {
      return String(value);
    }
  }

  return "";
}

async function requestData<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = await apiFetch<T | ApiEnvelope<T>>(path, {
    cache: "no-store",
    ...init,
  });

  return unwrapApiData(payload);
}

export function ProductCreatePage() {
  const router = useRouter();
  const nameId = useId();
  const descriptionId = useId();
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [garmentTypes, setGarmentTypes] = useState<CatalogItem[]>([]);
  const [existingStyles, setExistingStyles] = useState<ExistingStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const [garmentTypesData, stylesData] = await Promise.all([
          requestData<CatalogItem[]>("/api/garment-types"),
          requestData<ExistingStyle[]>("/api/styles"),
        ]);

        if (cancelled) {
          return;
        }

        setGarmentTypes(garmentTypesData.filter((item) => item.active !== false));
        setExistingStyles(stylesData);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? `${PRODUCTS.create.loadError}: ${requestError.message}`
              : PRODUCTS.create.loadError
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void Promise.resolve().then(run);

    return () => {
      cancelled = true;
    };
  }, []);

  const duplicateNameIndex = useMemo(
    () => buildProductNameDuplicateIndex(existingStyles),
    [existingStyles]
  );
  const duplicatedStyle = useMemo(
    () => findDuplicateProductName(duplicateNameIndex, formState.name),
    [duplicateNameIndex, formState.name]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (duplicatedStyle) {
      setError(PRODUCTS.form.errors.duplicateName);
      return;
    }

    setSubmitting(true);

    try {
      const style = await requestData<CreatedStyle>("/api/styles", {
        method: "POST",
        body: JSON.stringify({
          name: formState.name.trim(),
          garment_type_id: formState.garment_type_id,
          description: formState.description.trim() || null,
          active: true,
        }),
      });

      router.push(`/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : PRODUCTS.create.saveError
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PosHeader eyebrow={PRODUCTS.header.eyebrow} title={PRODUCTS.create.title} />

        {error ? (
          <div className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-4 py-3 text-sm text-[var(--ops-tone-danger-text)]">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor={nameId}
                className={opsInputCompact ? "text-sm font-semibold text-[var(--ops-text)]" : ""}
              >
                {PRODUCTS.form.name}
              </label>
              <Input
                id={nameId}
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={PRODUCTS.form.namePlaceholder}
                className="h-10 rounded-lg"
                required
              />
              {duplicatedStyle ? (
                <p className={`text-xs font-medium ${DUPLICATE_WARNING_TEXT}`}>
                  {PRODUCTS.form.errors.duplicateName}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--ops-text)]">
                {PRODUCTS.form.garmentType}
              </label>
              <OpsSelect
                value={formState.garment_type_id}
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    garment_type_id: value,
                  }))
                }
                placeholder={PRODUCTS.form.garmentTypePlaceholder}
                options={garmentTypes.map((item) => ({
                  value: getItemId(item, ["garment_type_id"]),
                  label: String(item.name || item.code || ""),
                }))}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor={descriptionId}
                className="text-sm font-semibold text-[var(--ops-text)]"
              >
                {PRODUCTS.form.description}
              </label>
              <textarea
                id={descriptionId}
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={1}
                maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                placeholder={PRODUCTS.form.descriptionPlaceholder}
                className={opsInputCompact + " min-h-9 resize-y"}
              />
              <div className="flex justify-end">
                <span className="text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
                  {PRODUCTS.form.descriptionCounter(
                    formState.description.length,
                    PRODUCT_DESCRIPTION_MAX_LENGTH
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--ops-border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--ops-text-muted)]">
              {PRODUCTS.create.helperText}
            </p>
            <Button
              type="submit"
              variant="accent"
              className="rounded-lg"
              disabled={
                loading ||
                submitting ||
                !formState.name.trim() ||
                !formState.garment_type_id ||
                Boolean(duplicatedStyle)
              }
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {PRODUCTS.create.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {PRODUCTS.create.submit}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
