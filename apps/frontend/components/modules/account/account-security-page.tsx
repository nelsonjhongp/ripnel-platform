"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AccountPageFrame,
  PanelSection,
  SettingsFormRow,
} from "@/components/account/account-preferences-ui";
import { ProtectedLoadingPage } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/lib/toast";
import { appRoutes } from "@/lib/routes";
import { ACC } from "./account-messages";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.new_password !== form.confirm_password) {
      setError(ACC.security.mismatch);
      return;
    }

    setSaving(true);

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm(emptyForm);
      showSuccess(ACC.security.success);
      router.replace("/inicio");
    } catch (changeError) {
      const msg = changeError instanceof Error
        ? changeError.message
        : ACC.security.error;
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProtectedLoadingPage title={ACC.security.loading} />;
  }

  if (!user) {
    return null;
  }

  const isRequired = Boolean(user.must_change_password);

  return (
    <AccountPageFrame
      backHref={isRequired ? undefined : appRoutes.account}
      backLabel={isRequired ? undefined : ACC.back}
      title={ACC.sections.security}
    >
      <PanelSection
        title={ACC.security.title}
        icon={KeyRound}
      >
        <form onSubmit={submitPassword}>
          <SettingsFormRow label={ACC.security.currentPassword}>
            <InputGroup className="h-9 rounded-md border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none focus-within:border-[var(--ripnel-accent)] focus-within:ring-[color:var(--ripnel-accent-soft)]">
              <InputGroupInput
                type={showCurrentPassword ? "text" : "password"}
                value={form.current_password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, current_password: event.target.value }))
                }
                required
                autoComplete="current-password"
                className="h-full rounded-md px-3 text-sm text-[var(--ops-text)]"
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  aria-label={showCurrentPassword ? ACC.security.hideCurrent : ACC.security.showCurrent}
                  className="h-7 w-7 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                >
                  {showCurrentPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </SettingsFormRow>

          <SettingsFormRow
            label={ACC.security.newPassword}
            detail={ACC.security.newPasswordHint}
          >
            <InputGroup className="h-9 rounded-md border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none focus-within:border-[var(--ripnel-accent)] focus-within:ring-[color:var(--ripnel-accent-soft)]">
              <InputGroupInput
                type={showNewPassword ? "text" : "password"}
                value={form.new_password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, new_password: event.target.value }))
                }
                required
                minLength={10}
                autoComplete="new-password"
                className="h-full rounded-md px-3 text-sm text-[var(--ops-text)]"
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowNewPassword((value) => !value)}
                  aria-label={showNewPassword ? ACC.security.hideNew : ACC.security.showNew}
                  className="h-7 w-7 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                >
                  {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </SettingsFormRow>

          <SettingsFormRow label={ACC.security.confirm}>
            <InputGroup className="h-9 rounded-md border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none focus-within:border-[var(--ripnel-accent)] focus-within:ring-[color:var(--ripnel-accent-soft)]">
              <InputGroupInput
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirm_password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, confirm_password: event.target.value }))
                }
                required
                minLength={10}
                autoComplete="new-password"
                className="h-full rounded-md px-3 text-sm text-[var(--ops-text)]"
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? ACC.security.hideConfirm : ACC.security.showConfirm}
                  className="h-7 w-7 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </SettingsFormRow>

          {error ? (
            <p className="px-4 py-2 text-sm font-medium text-[var(--ops-tone-danger-text)]">{error}</p>
          ) : null}

          <div className="flex justify-end border-t border-[var(--ops-border-strong)] px-4 py-3">
            <Button
              type="submit"
              disabled={saving}
              variant="accent"
              size="sm"
              className="h-9 rounded-md px-3.5 text-sm font-semibold"
            >
              {saving ? ACC.security.saving : ACC.security.submit}
            </Button>
          </div>
        </form>
      </PanelSection>
    </AccountPageFrame>
  );
}
