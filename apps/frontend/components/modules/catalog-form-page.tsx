"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogFieldConfig } from "@/lib/product-master-metadata";

type CatalogFormItem = {
  [key: string]: unknown;
  active?: boolean;
  name?: string;
  code?: string | null;
};

type CatalogFormPageProps = {
  catalogLabel: string;
  catalogRoute: string;
  endpoint: string;
  fields: CatalogFieldConfig[];
  idKey: string;
  duplicateStrategy: "name" | "name+code";
  mode: "create" | "edit";
  itemId?: string | null;
};

function buildInitialState(fields: CatalogFieldConfig[]) {
  const state: Record<string, string | boolean> = { active: true };

  for (const field of fields) {
    state[field.key] = "";
  }

  return state;
}

function normalizeValue(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function requestCatalogItems(endpoint: string) {
  const response = await fetch(buildApiUrl(endpoint), {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar el catalogo");
  }

  return (Array.isArray(payload.data) ? payload.data : []) as CatalogFormItem[];
}

export function CatalogFormPage({
  catalogLabel,
  catalogRoute,
  endpoint,
  fields,
  idKey,
  duplicateStrategy,
  mode,
  itemId = null,
}: CatalogFormPageProps) {
  const router = useRouter();
  const [items, setItems] = useState<CatalogFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, string | boolean>>(
    buildInitialState(fields)
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    requestCatalogItems(endpoint)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setItems(data);

        if (mode === "edit") {
          const matched = data.find((item) => String(item[idKey] || "") === itemId);

          if (!matched) {
            setError("No se encontro el registro para editar.");
            return;
          }

          const nextState = buildInitialState(fields);

          for (const field of fields) {
            nextState[field.key] =
              matched[field.key] === null || matched[field.key] === undefined
                ? ""
                : String(matched[field.key]);
          }

          nextState.active = Boolean(matched.active);
          setFormState(nextState);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el catalogo"
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, fields, idKey, itemId, mode]);

  const duplicateCandidates = useMemo(() => {
    const normalizedName = normalizeValue(formState.name);
    const normalizedCode = normalizeValue(formState.code);

    if (!normalizedName && !normalizedCode) {
      return [];
    }

    return items
      .filter((item) => {
        if (mode === "edit" && String(item[idKey] || "") === itemId) {
          return false;
        }

        const itemName = normalizeValue(item.name);
        const itemCode = normalizeValue(item.code);

        const matchesName = normalizedName ? itemName.includes(normalizedName) : false;
        const matchesCode =
          duplicateStrategy === "name+code" && normalizedCode
            ? itemCode.includes(normalizedCode)
            : false;

        return matchesName || matchesCode;
      })
      .slice(0, 5);
  }, [duplicateStrategy, formState.code, formState.name, idKey, itemId, items, mode]);

  const exactDuplicate = useMemo(() => {
    const normalizedName = normalizeValue(formState.name);
    const normalizedCode = normalizeValue(formState.code);

    return duplicateCandidates.find((item) => {
      const sameName = normalizedName && normalizeValue(item.name) === normalizedName;
      const sameCode =
        duplicateStrategy === "name+code" &&
        normalizedCode &&
        normalizeValue(item.code) === normalizedCode;

      return Boolean(sameName || sameCode);
    });
  }, [duplicateCandidates, duplicateStrategy, formState.code, formState.name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isEditing = mode === "edit";
      const editableFields = fields.filter((field) => field.editableOnUpdate !== false);
      const requestBody = isEditing
        ? editableFields.reduce<Record<string, string | boolean>>((accumulator, field) => {
            accumulator[field.key] = formState[field.key];
            return accumulator;
          }, { active: Boolean(formState.active) })
        : formState;

      const response = await fetch(
        buildApiUrl(isEditing ? `${endpoint}/${itemId}` : endpoint),
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            (isEditing
              ? "No se pudo actualizar el registro"
              : "No se pudo crear el registro")
        );
      }

      setSuccessMessage(
        isEditing
          ? "Registro actualizado correctamente."
          : "Registro creado correctamente."
      );

      router.push(catalogRoute);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : mode === "edit"
            ? "No se pudo actualizar el registro"
            : "No se pudo crear el registro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="ops-page min-h-screen p-4 md:p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="flex flex-col gap-3">
          <Button asChild variant="outline" size="sm" className="w-fit rounded-full">
            <Link href={catalogRoute}>
              <ArrowLeft className="h-4 w-4" />
              Volver a {catalogLabel.toLowerCase()}
            </Link>
          </Button>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ripnel-accent-hover)]">
              Catalogos
            </p>
            <h1 className="ops-title mt-1 text-2xl font-semibold">
              {mode === "edit" ? `Editar ${catalogLabel.toLowerCase()}` : `Nuevo ${catalogLabel.toLowerCase()}`}
            </h1>
          </div>
        </header>

        <article className="ops-surface rounded-3xl border p-4 md:p-5">
          {loading ? (
            <div className="ops-text-muted flex min-h-40 items-center justify-center">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando formulario...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--ops-text)]">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={String(formState[field.key] || "")}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      disabled={Boolean(mode === "edit" && field.editableOnUpdate === false)}
                      className="ops-surface min-h-24 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)]/20 disabled:cursor-not-allowed disabled:bg-[var(--ops-surface-muted)] disabled:text-[var(--ops-text-muted)]"
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={String(formState[field.key] || "")}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      disabled={Boolean(mode === "edit" && field.editableOnUpdate === false)}
                      className="ops-surface h-10 rounded-2xl border disabled:bg-[var(--ops-surface-muted)] disabled:text-[var(--ops-text-muted)]"
                    />
                  )}
                  {field.helper ? (
                    <p className="ops-text-muted text-xs leading-5">{field.helper}</p>
                  ) : null}
                  {mode === "edit" && field.editableOnUpdate === false ? (
                    <p className="ops-text-muted text-xs leading-5">
                      Este campo queda bloqueado en edicion para mantener estabilidad operativa.
                    </p>
                  ) : null}
                </div>
              ))}

              {duplicateCandidates.length ? (
                <div className={`rounded-2xl border px-3 py-3 text-sm ${
                  exactDuplicate
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-[color:var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                }`}>
                  <p className="font-medium">
                    {exactDuplicate
                      ? "Ya existe un registro con ese nombre o codigo."
                      : "Coincidencias encontradas."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {duplicateCandidates.map((item) => (
                      <span
                        key={String(item[idKey] || item.name || item.code)}
                        className="ops-metric-pill inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                      >
                        {String(item.name || "-")}
                        {item.code ? ` · ${String(item.code)}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="ops-surface-muted flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm text-[var(--ops-text)]">
                <input
                  type="checkbox"
                  checked={Boolean(formState.active)}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[color:var(--ops-border-strong)]"
                />
                {mode === "edit" ? "Mantener registro activo" : "Crear como registro activo"}
              </label>

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

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting} variant="accent" className="h-10 rounded-2xl px-4">
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {mode === "edit" ? "Guardar cambios" : "Crear registro"}
                    </>
                  )}
                </Button>

                <Button asChild type="button" variant="outline" className="h-10 rounded-2xl px-4">
                  <Link href={catalogRoute}>Cancelar</Link>
                </Button>
              </div>
            </form>
          )}
        </article>
      </div>
    </section>
  );
}
