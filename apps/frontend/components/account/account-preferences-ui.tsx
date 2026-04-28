import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

export const THEME_CHOICES = [
  { value: "light-stone", label: "Claro neutro" },
  { value: "light-slate", label: "Gris operativo" },
  { value: "dark-graphite", label: "Oscuro grafito" },
] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number]["value"];

export function resolveThemeChoice(themeMode: "light" | "dark", themePreset: string): ThemeChoice {
  if (themeMode === "dark") {
    return "dark-graphite";
  }

  if (themePreset === "slate") {
    return "light-slate";
  }

  return "light-stone";
}

export function resolveThemePreference(choice: ThemeChoice) {
  if (choice === "dark-graphite") {
    return { themeMode: "dark" as const, themePreset: "graphite" as const };
  }

  if (choice === "light-slate") {
    return { themeMode: "light" as const, themePreset: "slate" as const };
  }

  return { themeMode: "light" as const, themePreset: "stone" as const };
}

export function locationTypeLabel(type: string) {
  if (type === "store") return "Tienda";
  if (type === "warehouse") return "Almacen";
  if (type === "workshop") return "Taller";
  if (type === "third_party") return "Tercero";
  return "Ubicacion";
}

export function AccountPageFrame({
  backHref,
  backLabel,
  title,
  description,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ops-page min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[688px] space-y-6">
        <SettingsPageHeader
          backHref={backHref}
          backLabel={backLabel}
          title={title}
          description={description}
        />

        {children}
      </div>
    </section>
  );
}

export function SettingsPageHeader({
  backHref,
  backLabel,
  title,
  description,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="space-y-4">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}

      <div className="space-y-1.5">
        <h1 className="scroll-m-20 text-2xl leading-8 font-semibold tracking-[-0.025em] text-[var(--ops-text)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-5 text-[var(--ops-text-muted)]">{description}</p>
        ) : null}
      </div>
    </header>
  );
}

export function SettingsSectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-2.5 px-0.5">
      {Icon ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] shadow-sm">
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div className="min-w-0">
        <h2 className="scroll-m-20 text-base leading-6 font-semibold text-[var(--ops-text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm leading-5 text-[var(--ops-text-muted)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsFieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-semibold text-[var(--ops-text)]">{children}</span>;
}

export function SettingsFieldHint({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-xs leading-4 text-[var(--ops-text-muted)]">{children}</span>;
}

export function PanelSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SettingsSectionHeader title={title} description={description} icon={Icon} />

      <div className="ops-surface overflow-hidden rounded-lg border shadow-sm">{children}</div>
    </section>
  );
}

export function ValueRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
      <div className="min-w-0">
        <SettingsFieldLabel>{label}</SettingsFieldLabel>
        {detail ? <SettingsFieldHint>{detail}</SettingsFieldHint> : null}
      </div>
      <div className="min-h-8 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)]">
        {value}
      </div>
    </div>
  );
}

export function SelectRow({
  label,
  detail,
  value,
  onChange,
  children,
}: {
  label: string;
  detail?: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
      <div className="min-w-0">
        <SettingsFieldLabel>{label}</SettingsFieldLabel>
        {detail ? <SettingsFieldHint>{detail}</SettingsFieldHint> : null}
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full cursor-pointer appearance-none rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 pr-10 text-sm font-medium text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
      </div>
    </div>
  );
}
