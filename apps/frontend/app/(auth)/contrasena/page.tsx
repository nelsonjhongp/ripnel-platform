"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { AuthCard, AuthShell } from "@/components/auth/auth-shell"
import { ProtectedLoadingPage } from "@/components/feedback/status-page"
import { showSuccess, showError } from "@/lib/toast"
import { appRoutes } from "@/lib/routes"
import { ACC } from "@/components/modules/account/account-messages"
import { AccountPasswordForm } from "@/components/modules/account/account-security-page"
import {
  emptyPasswordForm,
  mapPasswordChangeError,
  validatePasswordChangeInput,
  type PasswordForm,
  type PasswordFormErrors,
} from "@/components/modules/account/account-password-utils"

type PasswordField = keyof PasswordForm

export default function ContrasenaPage() {
  const router = useRouter()
  const { user, loading, changePassword } = useAuth()
  const [form, setForm] = useState<PasswordForm>(emptyPasswordForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<PasswordFormErrors | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  function setField(field: PasswordField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current) return current
      const next = { ...current }
      delete next._form
      delete next[field]
      if (field === "new_password") {
        delete next.confirm_password
      }
      return Object.keys(next).length > 0 ? next : null
    })
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validatePasswordChangeInput(form, "auth")
    if (validation) {
      setErrors(validation)
      return
    }

    setSaving(true)
    setErrors(null)

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setForm(emptyPasswordForm)
      showSuccess(ACC.security.success)
      router.replace(appRoutes.home)
    } catch (changeError) {
      const mapped = mapPasswordChangeError(changeError)
      setErrors(mapped)
      showError(
        mapped._form || mapped.current_password || mapped.new_password || ACC.security.error,
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ProtectedLoadingPage title={ACC.security.loading} />
  }

  if (!user) {
    router.replace(appRoutes.login)
    return null
  }

  if (!user.must_change_password) {
    router.replace(appRoutes.home)
    return null
  }

  return (
    <AuthShell footer={ACC.security.footer}>
      <AuthCard
        logo={
          <Image
            src="/ripnel-logo.svg"
            alt={ACC.brandName}
            width={48}
            height={44}
            className="object-contain"
            priority
          />
        }
        eyebrow={ACC.security.requiredEyebrow}
        title={ACC.security.requiredTitle}
        subtitle={ACC.security.requiredSubtitle}
      >
        <AccountPasswordForm
          layout="auth"
          form={form}
          errors={errors}
          saving={saving}
          showCurrentPassword={showCurrentPassword}
          showNewPassword={showNewPassword}
          showConfirmPassword={false}
          currentPasswordPlaceholder={ACC.security.currentPasswordPlaceholder}
          newPasswordPlaceholder={ACC.security.newPasswordPlaceholder}
          onFieldChange={setField}
          onToggleCurrent={() => setShowCurrentPassword((v) => !v)}
          onToggleNew={() => setShowNewPassword((v) => !v)}
          onToggleConfirm={() => {}}
          onSubmit={submitPassword}
        />
      </AuthCard>
    </AuthShell>
  )
}
