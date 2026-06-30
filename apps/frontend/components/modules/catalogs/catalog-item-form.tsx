"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import type { CatalogRecord } from "@/lib/api-catalogs";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { OpsReadonlyFieldState } from "@/components/ui/ops-selection";
import { opsInputCompact } from "@/components/ui/ops-control-styles";
import { Button } from "@/components/ui/button";
import { INFO_BOX_MUTED, CUSTOMER_TYPE_PILL } from "./catalogs-constants";
import { CAT } from "./catalogs-messages";
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
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
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
  onSubmit,
  onCancel,
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
            <OpsFormField
              key={field.key}
              label={field.label}
              hint={field.helper}
              density="compact"
            >
              <OpsReadonlyFieldState
                value={String(formState[field.key] || "")}
                placeholder={field.placeholder ?? undefined}
              />
            </OpsFormField>
          );
        }

        return (
          <OpsFormField
            key={field.key}
            label={field.label}
            hint={field.helper}
            density="compact"
          >
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
                className={`${opsInputCompact} min-h-24 resize-y`}
              />
            ) : (
              <input
                type={field.type}
                value={String(formState[field.key] || "")}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className={opsInputCompact}
              />
            )}
          </OpsFormField>
        );
      })}

      {duplicateCandidates.length ? (
        exactDuplicate ? (
          <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)]`}>
            <p className="text-sm font-medium text-[var(--ops-tone-warning-text)]">
              {CAT.form.duplicateWarning}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {duplicateCandidates.map((item) => (
                <span
                  key={String(item[idKey] || item.name || item.code)}
                  className={CUSTOMER_TYPE_PILL}
                >
                  {String(item.name || "-")}
                  {item.code ? ` · ${String(item.code)}` : ""}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className={INFO_BOX_MUTED}>
            <p className="text-sm font-medium text-[var(--ops-text)]">
              {CAT.form.matchesFound}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {duplicateCandidates.map((item) => (
                <span
                  key={String(item[idKey] || item.name || item.code)}
                  className={CUSTOMER_TYPE_PILL}
                >
                  {String(item.name || "-")}
                  {item.code ? ` · ${String(item.code)}` : ""}
                </span>
              ))}
            </div>
          </div>
        )
      ) : null}

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(formState.active)}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              active: event.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
        />
        <span className="text-sm text-[var(--ops-text)]">
          {mode === "edit" ? CAT.form.keepActive : CAT.form.createActive}
        </span>
      </label>

      {error ? (
        <p className="text-sm font-medium text-[var(--ops-tone-danger-text)]">{error}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {CAT.form.cancel}
        </Button>
        <Button
          type="submit"
          variant="accent"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {CAT.form.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "edit" ? CAT.form.saveChanges : CAT.form.create}
            </>
          )}
        </Button>
      </div>
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
