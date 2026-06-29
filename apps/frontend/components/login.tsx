"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { AuthCard, AuthShell } from "@/components/auth/auth-shell"
import { LOGIN } from "@/components/auth/login-messages"
import { runLoginSubmission } from "@/components/auth/login-submission"
import {
  resolveLoginReasonMessage,
  sanitizeNextHref,
  translateLoginError,
} from "@/components/auth/login-utils"
import { AdminInlineMessage } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { OpsFormField, opsFormFieldErrorInputClass } from "@/components/ui/ops-form-field"

type LoginFormState = {
  username: string
  password: string
}

type LoginFieldErrors = {
  username?: string
  password?: string
}

type LoginSubmitPhase = "idle" | "submitting" | "redirecting"

const loginGroupClassName = opsFormFieldErrorInputClass(
  "sales-field h-9 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none transition hover:border-[var(--ops-border-soft)] hover:bg-[var(--ops-surface-muted)] focus-within:border-[var(--ripnel-accent)] focus-within:ring-[var(--ripnel-accent-soft)]",
)

const loginInputClassName =
  "h-full rounded-lg px-3.5 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)]"

const passwordToggleClassName =
  "h-8 w-8 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"

export default function LoginRipnel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, authMessage, clearAuthNotice } = useAuth()
  const [form, setForm] = useState<LoginFormState>({ username: "", password: "" })
  const [errors, setErrors] = useState<LoginFieldErrors | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitPhase, setSubmitPhase] = useState<LoginSubmitPhase>("idle")
  const [showPassword, setShowPassword] = useState(false)
  const submitLockRef = useRef(false)

  const nextHref = sanitizeNextHref(searchParams.get("next"))
  const reasonMessage = resolveLoginReasonMessage(searchParams.get("reason"), authMessage)
  const submitting = submitPhase !== "idle"

  const setField = (field: keyof LoginFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current?.[field]) {
        return current
      }

      return {
        ...current,
        [field]: undefined,
      }
    })
    setSubmitError(null)
  }

  const validateLoginForm = (): LoginFieldErrors | null => {
    if (!form.username.trim()) {
      return { username: LOGIN.error.missingUsername }
    }

    if (!form.password) {
      return { password: LOGIN.error.missingPassword }
    }

    return null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runLoginSubmission({
      isLocked: () => submitLockRef.current,
      lock: () => {
        submitLockRef.current = true
      },
      unlock: () => {
        submitLockRef.current = false
        setSubmitPhase("idle")
      },
      validate: validateLoginForm,
      onValidationError: (validationErrors) => {
        setErrors(validationErrors)
        setSubmitError(null)
      },
      beforeSubmit: () => {
        setErrors(null)
        setSubmitError(null)
        clearAuthNotice()
        setSubmitPhase("submitting")
      },
      executeLogin: () =>
        login({
          username: form.username.trim(),
          password: form.password,
        }),
      beforeRedirect: () => {
        setSubmitPhase("redirecting")
      },
      redirect: () => router.push(nextHref),
      onError: (error) => {
        setSubmitError(translateLoginError(error))
      },
    })
  }

  return (
    <AuthShell onBack={() => window.history.back()} footer={LOGIN.card.footer}>
      <AuthCard
        logo={
          <Image
            src="/ripnel-logo.svg"
            alt="Ripnel"
            width={48}
            height={44}
            className="object-contain"
            priority
          />
        }
        title={LOGIN.card.title}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {reasonMessage && !submitError ? (
            <AdminInlineMessage tone="warning">{reasonMessage}</AdminInlineMessage>
          ) : null}
          {submitError ? <AdminInlineMessage tone="danger">{submitError}</AdminInlineMessage> : null}

          <OpsFormField
            label={LOGIN.form.usernameLabel}
            error={errors?.username}
            density="compact"
          >
            <InputGroup className={loginGroupClassName}>
              <InputGroupInput
                type="text"
                name="username"
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                placeholder={LOGIN.form.usernamePlaceholder}
                required
                autoComplete="username"
                disabled={submitting}
                className={loginInputClassName}
              />
            </InputGroup>
          </OpsFormField>

          <OpsFormField
            label={LOGIN.form.passwordLabel}
            error={errors?.password}
            density="compact"
          >
            <InputGroup className={loginGroupClassName}>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
                placeholder={LOGIN.form.passwordPlaceholder}
                required
                autoComplete="current-password"
                disabled={submitting}
                className={loginInputClassName}
              />
              <InputGroupAddon align="inline-end" className="pr-1.5">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? LOGIN.form.hidePassword : LOGIN.form.showPassword}
                  className={passwordToggleClassName}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </OpsFormField>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-9 w-full rounded-lg text-sm font-semibold"
            variant="accent"
            size="lg"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{LOGIN.form.submitting}</span>
              </>
            ) : (
              <span>{LOGIN.form.submit}</span>
            )}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
