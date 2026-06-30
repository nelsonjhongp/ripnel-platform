"use client"

import type { Role, Location, UserFormState, UserFormErrors } from "./admin-types"
import { ADMIN } from "./admin-messages"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsMultiSelectField } from "@/components/ui/ops-multi-select-field"
import { opsInputCompact, INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"

export { type UserFormState, type UserFormErrors, EMPTY_USER_FORM } from "./admin-types"

type UserFormProps = {
  state: UserFormState
  errors: UserFormErrors | null
  onChange: (next: UserFormState) => void
  mode: "create" | "edit"
  roles: Role[]
  loadingRoles: boolean
  rolesError: string | null
  availableLocations: Location[]
  loadingLocations: boolean
  locationsError: string | null
}

function toggleLocationInState(current: UserFormState, locationId: string): UserFormState {
  const isSelected = current.location_ids.includes(locationId)
  const nextLocationIds = isSelected
    ? current.location_ids.filter((id) => id !== locationId)
    : [...current.location_ids, locationId]

  let nextDefault = current.default_location_id
  if (isSelected && current.default_location_id === locationId) {
    nextDefault = nextLocationIds[0] || ""
  } else if (!isSelected && !current.default_location_id) {
    nextDefault = locationId
  }

  return {
    ...current,
    location_ids: nextLocationIds,
    default_location_id: nextDefault,
  }
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
      {label}
    </p>
  )
}

export function UserForm({
  state,
  errors,
  onChange,
  mode,
  roles,
  loadingRoles,
  rolesError,
  availableLocations,
  loadingLocations,
  locationsError,
}: UserFormProps) {
  const isEdit = mode === "edit"

  const locationOptions = availableLocations.map((loc) => ({
    value: loc.location_id,
    label: loc.name,
  }))

  const defaultLocationOptions = availableLocations
    .filter((loc) => state.location_ids.includes(loc.location_id))
    .map((loc) => ({
      value: loc.location_id,
      label: loc.name,
    }))

  const handleToggleLocation = (locationId: string) => {
    onChange(toggleLocationInState(state, locationId))
  }

  return (
    <div className="space-y-5">
      {errors?._form ? (
        <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
          {errors._form}
        </div>
      ) : null}

      <div className="space-y-3">
        <SectionHeader label={ADMIN.form.identity} />

        <div className="grid gap-3 sm:grid-cols-2">
          <OpsFormField label={ADMIN.form.fullName} required error={errors?.full_name} density="compact">
            <input
              type="text"
              autoComplete="off"
              value={state.full_name}
              onChange={(e) => onChange({ ...state, full_name: e.target.value })}
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField label={ADMIN.form.username} required error={errors?.username} density="compact">
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              value={state.username}
              onChange={(e) => onChange({ ...state, username: e.target.value })}
              className={opsInputCompact}
            />
          </OpsFormField>
        </div>

        <OpsFormField label={ADMIN.form.email} optionalLabel error={errors?.email} density="compact">
          <input
            type="email"
            autoComplete="off"
            value={state.email}
            onChange={(e) => onChange({ ...state, email: e.target.value })}
            className={opsInputCompact}
          />
        </OpsFormField>

        <OpsFormField label={ADMIN.form.role} required={!isEdit} error={errors?.role_id} hint={rolesError || undefined} density="compact">
          <OpsSelect
            value={state.role_id}
            onChange={(v) => onChange({ ...state, role_id: v })}
            placeholder={ADMIN.form.rolePlaceholder(loadingRoles, rolesError)}
            options={roles.map((role) => ({ value: role.role_id, label: role.name }))}
            disabled={loadingRoles || Boolean(rolesError)}
          />
        </OpsFormField>
      </div>

      {!isEdit ? (
        <div className="space-y-3">
          <SectionHeader label={ADMIN.form.operation} />

          {loadingLocations ? (
            <OpsFormField label={ADMIN.form.sections.sedes} required density="compact">
              <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
                {ADMIN.form.loadingSedes}
              </div>
            </OpsFormField>
          ) : locationsError ? (
            <OpsFormField label={ADMIN.form.sections.sedes} required density="compact">
              <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]`}>
                {locationsError}
              </div>
            </OpsFormField>
          ) : (
            <OpsMultiSelectField
              label={ADMIN.form.sections.sedes}
              required
              error={errors?.location_ids}
              selectedValues={state.location_ids}
              onToggle={handleToggleLocation}
              options={locationOptions}
              placeholder={ADMIN.form.sedesPlaceholder}
              emptyMessage={ADMIN.form.sedesNoneActive}
            />
          )}

          {state.location_ids.length > 1 ? (
            <OpsFormField
              label={ADMIN.form.sedesDefault}
              error={errors?.default_location_id ? ADMIN.errors.user.defaultLocationRequired : undefined}
              density="compact"
            >
              <OpsSelect
                value={state.default_location_id}
                onChange={(v) => onChange({ ...state, default_location_id: v })}
                placeholder={ADMIN.form.sedesDefaultPlaceholder(true)}
                options={defaultLocationOptions}
              />
            </OpsFormField>
          ) : null}
        </div>
      ) : null}

      {!isEdit ? (
        <OpsFormField label={ADMIN.form.state} density="compact">
          <label className="inline-flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={state.active}
              onChange={(e) => onChange({ ...state, active: e.target.checked })}
              className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
            />
            <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">
              {ADMIN.form.userActiveLabel}
            </span>
          </label>
        </OpsFormField>
      ) : null}
    </div>
  )
}
