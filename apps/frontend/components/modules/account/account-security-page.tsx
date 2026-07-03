"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Check, Circle, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AccountPageFrame,
  PanelSection,
  SettingsFormRow,
} from "@/components/account/account-preferences-ui";
import { ProtectedLoadingPage } from "@/components/feedback/status-page";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { OpsFormField, opsFormFieldErrorInputClass } from "@/components/ui/ops-form-field";
import { showSuccess, showError } from "@/lib/toast";
import { ACC } from "./account-messages";
import { INFO_BOX_MUTED } from "./account-constants";
import {
  derivePasswordChecklist,
  emptyPasswordForm,
  mapPasswordChangeError,
  validatePasswordChangeInput,
  type PasswordChecklistState,
  type PasswordForm,
  type PasswordFormErrors,
} from "./account-password-utils";

type PasswordField = keyof PasswordForm;

const passwordGroupClassName = opsFormFieldErrorInputClass(
  "h-9 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none transition hover:border-[var(--ops-border-soft)] hover:bg-[var(--ops-surface-muted)] focus-within:border-[var(--ripnel-accent)] focus-within:ring-[var(--ripnel-accent-soft)]",
);

const passwordInputClassName = "h-full rounded-lg px-3.5 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)]";
const passwordToggleClassName =
  "h-8 w-8 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]";

function PasswordChecklist({ state }: { state: PasswordChecklistState }) {
  const items = [
    { label: ACC.security.checklist.minLength, done: state.hasMinLength },
    { label: ACC.security.checklist.letter, done: state.hasLetter },
    { label: ACC.security.checklist.number, done: state.hasNumber },
  ];

  return (
    <div className="mt-2 grid gap-1.5 text-[11px] font-medium text-[var(--ops-text-muted)]">
      {items.map((item) => {
        const Icon = item.done ? Check : Circle;
        return (
          <span
            key={item.label}
            className={item.done ? "inline-flex items-center gap-1.5 text-[var(--ops-tone-success-text)]" : "inline-flex items-center gap-1.5"}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  ariaLabel,
  autoComplete,
  placeholder,
  error,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
  autoComplete: string;
  placeholder?: string;
  error?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <InputGroup
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      className={passwordGroupClassName}
      data-field-error={error ? "true" : undefined}
    >
      <InputGroupInput
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        autoComplete={autoComplete}
        className={passwordInputClassName}
      />
      <InputGroupAddon align="inline-end" className="pr-1.5">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={ariaLabel}
          className={passwordToggleClassName}
        >
          {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function AccountPasswordForm({
  layout,
  form,
  errors,
  saving,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  currentPasswordPlaceholder,
  newPasswordPlaceholder,
  confirmPasswordPlaceholder,
  onFieldChange,
  onToggleCurrent,
  onToggleNew,
  onToggleConfirm,
  onSubmit,
}: {
  layout: "auth" | "settings";
  form: PasswordForm;
  errors: PasswordFormErrors | null;
  saving: boolean;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  currentPasswordPlaceholder?: string;
  newPasswordPlaceholder?: string;
  confirmPasswordPlaceholder?: string;
  onFieldChange: (field: PasswordField, value: string) => void;
  onToggleCurrent: () => void;
  onToggleNew: () => void;
  onToggleConfirm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const checklist = derivePasswordChecklist(form.new_password);
  const submitContent = saving ? (
    <span className="inline-flex items-center gap-2">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {ACC.security.saving}
    </span>
  ) : (
    ACC.security.submit
  );

  if (layout === "auth") {
    return (
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        {errors?._form ? (
          <div className={`${INFO_BOX_MUTED} flex items-start gap-2.5 border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-5">{errors._form}</span>
          </div>
        ) : null}
        <OpsFormField label={ACC.security.currentPassword} error={errors?.current_password} density="compact" required>
          <PasswordInput
            value={form.current_password}
            onChange={(value) => onFieldChange("current_password", value)}
            show={showCurrentPassword}
            onToggle={onToggleCurrent}
            ariaLabel={showCurrentPassword ? ACC.security.hideCurrent : ACC.security.showCurrent}
            autoComplete="current-password"
            placeholder={currentPasswordPlaceholder}
            error={errors?.current_password}
          />
        </OpsFormField>
        <OpsFormField label={ACC.security.newPassword} error={errors?.new_password} density="compact" required>
          <PasswordInput
            value={form.new_password}
            onChange={(value) => onFieldChange("new_password", value)}
            show={showNewPassword}
            onToggle={onToggleNew}
            ariaLabel={showNewPassword ? ACC.security.hideNew : ACC.security.showNew}
            autoComplete="new-password"
            placeholder={newPasswordPlaceholder}
            error={errors?.new_password}
          />
          <PasswordChecklist state={checklist} />
        </OpsFormField>
        <Button
          type="submit"
          disabled={saving}
          variant="accent"
          size="lg"
          className="mt-2 h-9 w-full rounded-lg text-sm font-semibold"
        >
          {submitContent}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <SettingsFormRow label={ACC.security.currentPassword}>
        <PasswordInput
          value={form.current_password}
          onChange={(value) => onFieldChange("current_password", value)}
          show={showCurrentPassword}
          onToggle={onToggleCurrent}
          ariaLabel={showCurrentPassword ? ACC.security.hideCurrent : ACC.security.showCurrent}
          autoComplete="current-password"
          error={errors?.current_password}
        />
        {errors?.current_password ? (
          <p role="alert" className="mt-1.5 text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
            {errors.current_password}
          </p>
        ) : null}
      </SettingsFormRow>
      <SettingsFormRow label={ACC.security.newPassword} detail={ACC.security.newPasswordHint}>
        <PasswordInput
          value={form.new_password}
          onChange={(value) => onFieldChange("new_password", value)}
          show={showNewPassword}
          onToggle={onToggleNew}
          ariaLabel={showNewPassword ? ACC.security.hideNew : ACC.security.showNew}
          autoComplete="new-password"
          error={errors?.new_password}
        />
        <PasswordChecklist state={checklist} />
        {errors?.new_password ? (
          <p role="alert" className="mt-1.5 text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
            {errors.new_password}
          </p>
        ) : null}
      </SettingsFormRow>
      <SettingsFormRow label={ACC.security.confirm}>
        <PasswordInput
          value={form.confirm_password}
          onChange={(value) => onFieldChange("confirm_password", value)}
          show={showConfirmPassword}
          onToggle={onToggleConfirm}
          ariaLabel={showConfirmPassword ? ACC.security.hideConfirm : ACC.security.showConfirm}
          autoComplete="new-password"
          error={errors?.confirm_password}
        />
        {errors?.confirm_password ? (
          <p role="alert" className="mt-1.5 text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
            {errors.confirm_password}
          </p>
        ) : null}
      </SettingsFormRow>
      {errors?._form ? (
        <div className={`${INFO_BOX_MUTED} mx-4 border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>{errors._form}</div>
      ) : null}
      <div className="flex justify-end border-t border-[var(--ops-border-strong)] px-4 py-3">
        <Button
          type="submit"
          disabled={saving}
          variant="accent"
          size="sm"
          className="h-9 rounded-lg px-3.5 text-sm font-semibold"
        >
          {submitContent}
        </Button>
      </div>
    </form>
  );
}

export default function AccountSecurityPage() {
  const { user, loading, changePassword } = useAuth();
  const [form, setForm] = useState<PasswordForm>(emptyPasswordForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<PasswordFormErrors | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function setField(field: PasswordField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current) return current;
      const next = { ...current };
      delete next._form;
      delete next[field];
      if (field === "new_password") {
        delete next.confirm_password;
      }
      return Object.keys(next).length > 0 ? next : null;
    });
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validatePasswordChangeInput(form, "settings");
    if (validation) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    setErrors(null);

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm(emptyPasswordForm);
      showSuccess(ACC.security.success);
    } catch (changeError) {
      const mapped = mapPasswordChangeError(changeError);
      setErrors(mapped);
      showError(mapped._form || mapped.current_password || mapped.new_password || mapped.confirm_password || ACC.security.error);
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

  const formProps = {
    form,
    errors,
    saving,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    onFieldChange: setField,
    onToggleCurrent: () => setShowCurrentPassword((value) => !value),
    onToggleNew: () => setShowNewPassword((value) => !value),
    onToggleConfirm: () => setShowConfirmPassword((value) => !value),
    onSubmit: submitPassword,
  };

  return (
    <AccountPageFrame backHref="/cuenta" backLabel={ACC.back} title={ACC.sections.security}>
      <PanelSection title={ACC.security.title} icon={KeyRound}>
        <AccountPasswordForm layout="settings" {...formProps} />
      </PanelSection>
    </AccountPageFrame>
  );
}
