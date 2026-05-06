"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AccountPageFrame,
  PanelSection,
  SettingsFieldHint,
  SettingsFieldLabel,
} from "@/components/account/account-preferences-ui";

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const emptyForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function AccountSecurityPage() {
  const router = useRouter();
  const { user, loading, changePassword } = useAuth();
  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (form.new_password !== form.confirm_password) {
      setError("La confirmacion no coincide con la nueva contrasena.");
      return;
    }

    setSaving(true);

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm(emptyForm);
      setMessage("Contrasena actualizada.");
      router.replace("/inicio");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "No se pudo actualizar la contrasena."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="ops-page min-h-screen px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--ops-text-muted)]">Cargando cuenta...</div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  const isRequired = Boolean(user.must_change_password);

  return (
    <AccountPageFrame
      backHref={isRequired ? undefined : "/account"}
      backLabel={isRequired ? undefined : "Volver a perfil"}
      title="Seguridad"
    >
      <PanelSection title="Cambio de contraseña">
        <form onSubmit={submitPassword}>
          <label className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
            <span className="min-w-0">
              <SettingsFieldLabel>Contrasena actual</SettingsFieldLabel>
            </span>
            <input
              type="password"
              value={form.current_password}
              onChange={(event) =>
                setForm((current) => ({ ...current, current_password: event.target.value }))
              }
              required
              autoComplete="current-password"
              className="h-9 w-full rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
            />
          </label>

          <label className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
            <span className="min-w-0">
              <SettingsFieldLabel>Nueva contrasena</SettingsFieldLabel>
              <SettingsFieldHint>Minimo 10 caracteres, una letra y un numero.</SettingsFieldHint>
            </span>
            <input
              type="password"
              value={form.new_password}
              onChange={(event) =>
                setForm((current) => ({ ...current, new_password: event.target.value }))
              }
              required
              minLength={10}
              autoComplete="new-password"
              className="h-9 w-full rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
            />
          </label>

          <label className="grid gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
            <span className="min-w-0">
              <SettingsFieldLabel>Confirmar</SettingsFieldLabel>
            </span>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirm_password: event.target.value }))
              }
              required
              minLength={10}
              autoComplete="new-password"
              className="h-9 w-full rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
            />
          </label>

          {error ? (
            <div role="alert" aria-live="polite" className="border-t border-[var(--ops-border-strong)] px-4 py-3 text-sm text-rose-500">
              {error}
            </div>
          ) : null}
          {message ? (
            <div role="status" aria-live="polite" className="border-t border-[var(--ops-border-strong)] px-4 py-3 text-sm text-emerald-500">
              {message}
            </div>
          ) : null}

          <div className="flex justify-end border-t border-[var(--ops-border-strong)] px-4 py-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[var(--ripnel-accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Actualizar contrasena"}
            </button>
          </div>
        </form>
      </PanelSection>
    </AccountPageFrame>
  );
}
