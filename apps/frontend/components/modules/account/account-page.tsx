"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, KeyRound, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useVisualPreferences } from "@/components/appearance/VisualPreferencesProvider"
import { OpsSelect } from "@/components/ui/ops-selection"
import { appRoutes } from "@/lib/routes"
import { ACC } from "./account-messages"
import {
  AccountPageFrame,
  PanelSection,
  ValueRow,
  THEME_CHOICES,
  type ThemeChoice,
  resolveThemeChoice,
  resolveThemePreference,
} from "@/components/account/account-preferences-ui"

export default function AccountPage() {
  const { user, loading, locationAssignments, setDefaultLocation } = useAuth()
  const { preferences, savePreferences } = useVisualPreferences()
  const [savingLocation, setSavingLocation] = useState(false)

  if (loading || !user) return null

  const locationOptions = locationAssignments.length > 0
    ? locationAssignments.map((a) => ({
        value: a.location_id,
        label: a.location.name,
      }))
    : []

  const currentLocationId = locationAssignments.find((a) => a.is_default)?.location_id || ""

  async function handleLocationChange(locationId: string) {
    if (!locationId || locationId === currentLocationId || savingLocation) return
    setSavingLocation(true)
    try {
      await setDefaultLocation(locationId)
    } finally {
      setSavingLocation(false)
    }
  }

  const currentThemeChoice = resolveThemeChoice(preferences.themeMode, preferences.themePreset)
  const themeOptions = THEME_CHOICES.map((c) => ({ value: c.value, label: c.label }))

  function handleThemeChange(choice: string) {
    if (choice === currentThemeChoice) return
    const pref = resolveThemePreference(choice as ThemeChoice)
    savePreferences(pref)
  }

  const roleName = user.role_name || ACC.fields.noRole

  return (
    <AccountPageFrame backHref="/inicio" title={ACC.title}>
      <PanelSection title={ACC.sections.userInfo}>
        <ValueRow label={ACC.fields.name} value={user.full_name} />
        <ValueRow label={ACC.fields.username} value={`@${user.username}`} />
        <ValueRow label={ACC.fields.email} value={user.email || ACC.fields.noEmail} />
        <ValueRow label={ACC.fields.role} value={roleName} />
        <ValueRow label={ACC.fields.status} value={<span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {ACC.fields.active}</span>} />
      </PanelSection>

      <PanelSection title={ACC.sections.preferences}>
        {locationOptions.length > 0 && (
          <div className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-[var(--ops-row-py)] md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
            <span className="text-sm font-medium text-[var(--ops-text)]">{ACC.fields.operativeLocation}</span>
            <OpsSelect
              label=""
              value={currentLocationId}
              options={[{ value: "", label: ACC.fields.noDefaultLocation }, ...locationOptions]}
              onChange={handleLocationChange}
            />
          </div>
        )}
        <div className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-[var(--ops-row-py)] md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
          <span className="text-sm font-medium text-[var(--ops-text)]">{ACC.fields.appearance}</span>
          <OpsSelect
            label=""
            value={currentThemeChoice}
            options={themeOptions}
            onChange={handleThemeChange}
          />
        </div>
      </PanelSection>

      <PanelSection title={ACC.sections.advanced}>
        <Link
          href={appRoutes.accountSecurity}
          className="flex items-center justify-between border-t border-[var(--ops-border-strong)] px-4 py-[var(--ops-row-py)] transition hover:bg-[var(--ops-surface-muted)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
              <KeyRound className="h-4 w-4 text-[var(--ops-text-muted)]" />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--ops-text)]">{ACC.security.title}</p>
              <p className="text-xs text-[var(--ops-text-muted)]">{ACC.security.description}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--ops-text-muted)]" />
        </Link>
      </PanelSection>
    </AccountPageFrame>
  )
}
