"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import type { CatalogRecord } from "@/lib/api-catalogs";
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminField,
  AdminFormActionsBar,
  AdminInlineMessage,
  AdminInput,
  AdminReadonlyFieldState,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import type { CatalogFieldConfig } from "@/lib/product-master-metadata";

function normalizeValue(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export type CatalogItemFormProps = {
  catalogItems: CatalogRecord[];
  fields: CatalogFieldConfig[];
  idKey: string;
  duplicateStrategy: "name" | "name+code";
  mode: "create" | "edit";
  initialValues: Record<string, string | boolean>;
  readOnlyFieldKeys: string[];
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
  cancelHref?: string;
};

export function CatalogItemForm({
  catalogItems,
  fields,
  idKey,
  duplicateStrategy,
  mode,
  initialValues,
  readOnlyFieldKeys,
  submitting,
  error,
  successMessage,
  onSubmit,
  onCancel,
  cancelLabel = "Cancelar",
  cancelHref,
}: CatalogItemFormProps) {
  const [formState, setFormState] = useState<Record<string, string | boolean>>(initialValues);

  const duplicateCandidates = useMemo(() => {
    const normalizedName = normalizeValue(formState.name);
    const normalizedCode = normalizeValue(formState.code);

    if (!normalizedName && !normalizedCode) return [];

    return catalogItems
      .filter((item) => {
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
  }, [duplicateStrategy, formState.code, formState.name, catalogItems]);

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

    const editableFields = mode === "edit"
      ? fields.filter((field) => !readOnlyFieldKeys.includes(field.key))
      : fields;

    const body = mode === "edit"
      ? editableFields.reduce<Record<string, unknown>>((accumulator, field) => {
          accumulator[field.key] = formState[field.key];
          return accumulator;
        }, { active: Boolean(formState.active) })
      : { ...formState };

    await onSubmit(body);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => {
        const isReadonly = mode === "edit" && readOnlyFieldKeys.includes(field.key);

        if (isReadonly) {
          return (
            <AdminField key={field.key} label={field.label} hint={field.helper}>
              <AdminReadonlyFieldState
                value={String(formState[field.key] || "")}
                placeholder={field.placeholder ?? undefined}
              />
            </AdminField>
          );
        }

        return (
          <AdminField key={field.key} label={field.label} hint={field.helper}>
            {field.type === "textarea" ? (
              <AdminTextarea
                value={String(formState[field.key] || "")}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className="min-h-24"
              />
            ) : (
              <AdminInput
                type={field.type}
                value={String(formState[field.key] || "")}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
              />
            )}
          </AdminField>
        );
      })}

      {duplicateCandidates.length ? (
        exactDuplicate ? (
          <AdminInlineMessage tone="warning">
            <p className="font-medium">
              Ya existe un registro con ese nombre o codigo.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {duplicateCandidates.map((item) => (
                <span
                  key={String(item[idKey] || item.name || item.code)}
                  className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]"
                >
                  {String(item.name || "-")}
                  {item.code ? ` · ${String(item.code)}` : ""}
                </span>
              ))}
            </div>
          </AdminInlineMessage>
        ) : (
          <div className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
            <p className="font-medium">Coincidencias encontradas.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {duplicateCandidates.map((item) => (
                <span
                  key={String(item[idKey] || item.name || item.code)}
                  className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]"
                >
                  {String(item.name || "-")}
                  {item.code ? ` · ${String(item.code)}` : ""}
                </span>
              ))}
            </div>
          </div>
        )
      ) : null}

      <AdminCheckboxField
        label={mode === "edit" ? "Mantener registro activo" : "Crear como registro activo"}
        checked={Boolean(formState.active)}
        onChange={(checked) =>
          setFormState((current) => ({
            ...current,
            active: checked,
          }))
        }
      />

      {error ? (
        <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
      ) : null}

      {successMessage ? (
        <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
      ) : null}

      <AdminFormActionsBar>
        {cancelHref ? (
          <AdminActionButton type="button" tone="neutral" asChild>
            <Link href={cancelHref}>{cancelLabel}</Link>
          </AdminActionButton>
        ) : (
          <AdminActionButton type="button" tone="neutral" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </AdminActionButton>
        )}
        <AdminActionButton type="submit" tone="accent" disabled={submitting}>
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
        </AdminActionButton>
      </AdminFormActionsBar>
    </form>
  );
}

export function buildInitialState(fields: CatalogFieldConfig[]) {
  const state: Record<string, string | boolean> = { active: true };
  for (const field of fields) {
    state[field.key] = "";
  }
  return state;
}
