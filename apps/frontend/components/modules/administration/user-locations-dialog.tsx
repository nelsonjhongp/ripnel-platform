"use client"

import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { apiFetchData } from "@/lib/api"
import { showSuccess } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsMultiSelectField } from "@/components/ui/ops-multi-select-field"
import { INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"
import { ADMIN } from "./admin-messages"
import type { User, Location, UserLocationsPayload } from "./admin-types"

type UserLocationsDialogProps = {
  open: boolean
  user: User | null
  availableLocations: Location[]
  loadingLocations: boolean
  onClose: () => void
}

export function UserLocationsDialog({
  open,
  user,
  availableLocations,
  loadingLocations,
  onClose,
}: UserLocationsDialogProps) {
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [defaultLocationId, setDefaultLocationId] = useState<string | null>(null)
  const [loadingUserLocations, setLoadingUserLocations] = useState(false)
  const [actionState, setActionState] = useState<"idle" | "validating" | "saving">("idle")
  const [userLocationsError, setUserLocationsError] = useState<string | null>(null)
  const [defaultLocError, setDefaultLocError] = useState<string | null>(null)

  const isBusy = actionState !== "idle"

  useEffect(() => {
    if (!open || !user) return

    let cancelled = false

    async function load() {
      setLoadingUserLocations(true)
      setUserLocationsError(null)
      setDefaultLocError(null)
      try {
        const payload = await apiFetchData<UserLocationsPayload>(
          `/api/users/${user!.user_id}/locations`,
        )
        if (!cancelled) {
          setSelectedLocationIds(payload.assignments.map((a) => a.location_id))
          setDefaultLocationId(payload.default_location_id)
        }
      } catch (error) {
        if (!cancelled) {
          setUserLocationsError(
            error instanceof Error ? error.message : ADMIN.toast.locationsLoadError,
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingUserLocations(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, user])

  function toggleLocation(locationId: string) {
    setUserLocationsError(null)
    setDefaultLocError(null)
    setSelectedLocationIds((current) => {
      if (current.includes(locationId)) {
        const next = current.filter((value) => value !== locationId)
        if (defaultLocationId === locationId) {
          setDefaultLocationId(next[0] || null)
        }
        return next
      }
      const next = [...current, locationId]
      if (!defaultLocationId) {
        setDefaultLocationId(locationId)
      }
      return next
    })
  }

  function handleClose() {
    if (isBusy) return
    onClose()
  }

  async function saveUserLocations() {
    if (!user) return

    setActionState("validating")

    if (selectedLocationIds.length > 0 && !defaultLocationId) {
      setDefaultLocError(ADMIN.errors.user.defaultLocationRequired)
      setActionState("idle")
      return
    }

    setActionState("saving")
    setUserLocationsError(null)
    setDefaultLocError(null)

    try {
      await apiFetchData<UserLocationsPayload>(
        `/api/users/${user.user_id}/locations`,
        {
          method: "PUT",
          body: JSON.stringify({
            assignments: selectedLocationIds.map((location_id) => ({
              location_id,
              is_default: defaultLocationId === location_id,
            })),
          }),
        },
      )
      showSuccess(ADMIN.toast.locationsUpdated)
      onClose()
    } catch (error) {
      setUserLocationsError(
        error instanceof Error ? error.message : ADMIN.toast.locationsError,
      )
    } finally {
      setActionState("idle")
    }
  }

  const locationOptions = availableLocations.map((loc) => ({
    value: loc.location_id,
    label: loc.name,
  }))

  const defaultLocationOptions = availableLocations
    .filter((loc) => selectedLocationIds.includes(loc.location_id))
    .map((loc) => ({
      value: loc.location_id,
      label: loc.name,
    }))

  return (
    <OpsDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
      title={ADMIN.dialog.locationsTitle}
      description={
        user ? ADMIN.dialog.locationsDesc(user.full_name) : ADMIN.dialog.locationsDescGeneric
      }
      size="lg"
      bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={handleClose}
            disabled={isBusy}
          >
            {ADMIN.dialog.cancel}
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={() => void saveUserLocations()}
            disabled={isBusy || loadingUserLocations}
          >
            {actionState === "validating" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADMIN.dialog.validating}
              </span>
            ) : actionState === "saving" ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {ADMIN.dialog.saving}
              </span>
            ) : (
              ADMIN.dialog.saveLocations
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {userLocationsError ? (
          <div
            className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}
          >
            {userLocationsError}
          </div>
        ) : null}

        {loadingUserLocations || loadingLocations ? (
          <OpsFormField label={ADMIN.form.sections.sedes} required density="compact">
            <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
              {ADMIN.form.loadingSedes}
            </div>
          </OpsFormField>
        ) : availableLocations.length === 0 ? (
          <OpsFormField label={ADMIN.form.sections.sedes} required density="compact">
            <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
              {ADMIN.form.sedesNoneActive}
            </div>
          </OpsFormField>
        ) : (
          <>
            <OpsMultiSelectField
              label={ADMIN.form.sections.sedes}
              required
              selectedValues={selectedLocationIds}
              onToggle={toggleLocation}
              options={locationOptions}
              placeholder={ADMIN.form.sedesPlaceholder}
              emptyMessage={ADMIN.form.sedesNoneActive}
            />

            {selectedLocationIds.length > 1 ? (
              <OpsFormField
                label={ADMIN.form.sedesDefault}
                error={defaultLocError}
                density="compact"
              >
                <OpsSelect
                  value={defaultLocationId ?? ""}
                  onChange={(v) => {
                    setDefaultLocError(null)
                    setDefaultLocationId(v || null)
                  }}
                  placeholder={ADMIN.form.sedesDefaultPlaceholder(true)}
                  options={defaultLocationOptions}
                />
              </OpsFormField>
            ) : null}
          </>
        )}
      </div>
    </OpsDialog>
  )
}
