"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { AuthCard, AuthField, AuthShell } from "@/components/auth/auth-shell"
import { AdminInlineMessage } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const REASON_MESSAGES: Record<string, string> = {
  "session-expired": "Tu sesión expiró. Inicia sesión nuevamente para continuar.",
  "auth-required": "Debes iniciar sesión para acceder al módulo solicitado.",
  forbidden: "Tu usuario no tiene permisos suficientes para la operación solicitada.",
}

const BACKEND_ERROR_MAP: Record<string, string> = {
  "Invalid credentials": "Usuario o contraseña incorrectos",
  "Username and password are required": "Ingresa tu usuario y contraseña para continuar",
}

function translateError(raw: unknown): string {
  if (raw instanceof Error) {
    const mapped = BACKEND_ERROR_MAP[raw.message]
    if (mapped) return mapped
    return raw.message
  }

  return "No se pudo iniciar sesión"
}

export default function LoginRipnel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, authMessage, clearAuthNotice } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const nextPath = searchParams.get("next") || "/inicio"
  const nextHref = nextPath.startsWith("/") ? nextPath : "/inicio"
  const reason = searchParams.get("reason") || ""
  const reasonMessage = REASON_MESSAGES[reason] || authMessage

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const username = String(formData.get("username") || "").trim()
    const password = String(formData.get("password") || "")

    setError(null)
    clearAuthNotice()
    setSubmitting(true)

    try {
      await login({ username, password })
      router.push(nextHref)
    } catch (submitError) {
      setError(translateError(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell onBack={() => window.history.back()} footer="Creaciones Ripnel - Sistema ERP">
      <AuthCard
        logo={
          <Image
            src="/ripnel-logo.svg"
            alt="Ripnel"
            width={1271}
            height={898}
            className="h-14 w-auto object-contain"
            priority
          />
        }
        title="Inicio de sesión"
        subtitle="Accede al sistema de gestión operativa"
      >
        <form className="flex flex-col gap-[1.125rem]" onSubmit={handleSubmit}>
          {reasonMessage && !error ? <AdminInlineMessage tone="warning">{reasonMessage}</AdminInlineMessage> : null}
          {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}

          <AuthField htmlFor="username" label="Usuario o correo">
            <InputGroup className="h-11 rounded-[0.625rem] border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none focus-within:border-[var(--ripnel-accent)] focus-within:ring-[color:var(--ripnel-accent-soft)]">
              <InputGroupInput
                type="text"
                id="username"
                name="username"
                placeholder="Ingresa tu usuario o correo"
                required
                autoComplete="username"
                disabled={submitting}
                className="h-full rounded-[0.625rem] px-4 text-[0.8125rem] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)]"
              />
            </InputGroup>
          </AuthField>

          <AuthField htmlFor="password" label="Contraseña">
            <InputGroup className="h-11 rounded-[0.625rem] border-[var(--ops-border-strong)] bg-[var(--ops-field)] shadow-none focus-within:border-[var(--ripnel-accent)] focus-within:ring-[color:var(--ripnel-accent-soft)]">
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
                disabled={submitting}
                className="h-full rounded-[0.625rem] px-4 text-[0.8125rem] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)]"
              />
              <InputGroupAddon align="inline-end" className="pr-1.5">
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="h-8 w-8 rounded-md text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </AuthField>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
              />
              <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">Recordarme</span>
            </label>
            <a
              href="#"
              className="text-[0.8125rem] font-medium text-[color:color-mix(in_srgb,var(--ops-text-muted)_65%,transparent)] transition-colors hover:text-[var(--ripnel-accent)]"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-11 w-full rounded-[0.625rem] text-[0.875rem] font-semibold"
            variant="accent"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Ingresando...</span>
              </>
            ) : (
              <span>Iniciar sesión</span>
            )}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
