"use client";

import { Palette, RotateCcw } from "lucide-react";
import { useVisualPreferences } from "@/components/appearance/VisualPreferencesProvider";
import {
  AccountPageFrame,
  PanelSection,
  SelectRow,
  THEME_CHOICES,
  type ThemeChoice,
  resolveThemeChoice,
  resolveThemePreference,
} from "@/components/account/account-preferences-ui";

export default function AccountAppearancePage() {
  const { preferences, savePreferences, resetPreferences } = useVisualPreferences();
  const selectedThemeChoice = resolveThemeChoice(preferences.themeMode, preferences.themePreset);

  function handleThemeChange(value: string) {
    const nextTheme = resolveThemePreference(value as ThemeChoice);
    savePreferences({
      ...preferences,
      ...nextTheme,
    });
  }

  return (
    <AccountPageFrame
      backHref="/account"
      backLabel="Volver a perfil"
      title="Apariencia"
    >
      <PanelSection title="Apariencia" icon={Palette}>
        <SelectRow
          label="Tema"
          value={selectedThemeChoice}
          onChange={handleThemeChange}
        >
          {THEME_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectRow>

        <div className="flex justify-end border-t border-[var(--ops-border-strong)] px-4 py-3">
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-2 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-border-soft)]"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
        </div>
      </PanelSection>
    </AccountPageFrame>
  );
}
