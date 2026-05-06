"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { useState } from "react"
import { AtSign, KeyRound, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    } catch (e) {
      setError(translateError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-accent" />

      <button
        type="button"
        className="login-back"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="back-icon" />
        <span>Volver</span>
      </button>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Image
                src="/ripnel-logo.svg"
                alt="Ripnel"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <p className="login-eyebrow">ERP</p>
            <h1 className="login-title">Inicio de sesión</h1>
            <p className="login-subtitle">Accede al sistema de gestión operativa</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {reasonMessage && !error && (
              <div className="alert alert-warning">
                <AlertCircle className="alert-icon" />
                <span>{reasonMessage}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-danger">
                <AlertCircle className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="username" className="login-label">
                Usuario o correo
              </label>
              <div className="input-wrapper">
                <AtSign className="input-icon" />
                <Input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="ej: admin@ripnel.com"
                  required
                  autoComplete="username"
                  className="input-field"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Contraseña
              </label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Ingresa tu contraseña"
                  required
                  autoComplete="current-password"
                  className="input-field input-field--password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" />
                <span className="login-remember-label">Recordarme</span>
              </label>
              <a href="#" className="login-forgot">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="login-button"
              variant="accent"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="btn-spinner" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </Button>
          </form>
        </div>

        <p className="login-footer">Creaciones Ripnel — Sistema ERP</p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: var(--ops-page-background);
        }

        .login-bg-accent {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 50% at 50% 0%,
            rgb(176 122 228 / 0.06) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 416px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.875rem;
          padding: 1.5rem;
        }

        @media (prefers-reduced-motion: no-preference) {
          .login-container {
            animation: cardEntrance 400ms ease-out;
          }
        }

        @media (max-width: 639px) {
          .login-container {
            padding: 1rem;
          }
        }

        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-card {
          width: 100%;
          background: var(--ops-surface);
          border: 1px solid color-mix(in srgb, var(--ops-border-strong) 80%, var(--ripnel-accent) 20%);
          border-radius: 1.25rem;
          padding: 2.25rem;
          box-shadow:
            0 1px 2px rgb(0 0 0 / 0.04),
            0 4px 16px rgb(15 23 42 / 0.06);
        }

        @media (max-width: 639px) {
          .login-card {
            padding: 1.5rem;
            border-radius: 1rem;
          }
        }

        .dark .login-card {
          border-color: var(--ops-border-strong);
          box-shadow:
            0 1px 3px rgb(0 0 0 / 0.12),
            0 8px 24px rgb(0 0 0 / 0.2);
        }

        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .login-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.625rem;
        }

        .login-eyebrow {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ripnel-accent);
          margin-bottom: 0.25rem;
        }

        .login-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--ops-text);
          margin: 0;
          letter-spacing: -0.015em;
          line-height: 1.2;
        }

        .login-subtitle {
          font-size: 0.8125rem;
          color: var(--ops-text-muted);
          margin: 0.25rem 0 0;
          line-height: 1.4;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .login-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--ops-text);
          line-height: 1.3;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 0.9375rem;
          height: 0.9375rem;
          flex-shrink: 0;
          color: color-mix(in srgb, var(--ops-text-muted) 50%, transparent);
          pointer-events: none;
          z-index: 1;
        }

        .input-field {
          height: 2.75rem;
          width: 100%;
          padding-left: 2.25rem !important;
          padding-right: 1rem !important;
          background: var(--ops-field);
          border-color: var(--ops-border-strong);
          font-size: 0.8125rem;
          color: var(--ops-text);
          border-radius: 0.625rem;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .input-field--password {
          padding-right: 2.75rem !important;
        }

        .input-field::placeholder {
          color: var(--ops-text-muted);
          opacity: 0.72;
        }

        .input-field:focus {
          border-color: var(--ripnel-accent);
          box-shadow: 0 0 0 3px var(--ripnel-accent-soft);
        }

        .dark .input-field {
          background: var(--ops-field);
          border-color: var(--ops-border-strong);
          color: var(--ops-text);
        }

        .password-toggle {
          position: absolute;
          right: 0.375rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--ops-text-muted);
          border-radius: 0.375rem;
          transition: color 120ms ease, background 120ms ease;
        }

        .password-toggle:hover {
          color: var(--ops-text);
          background: var(--ops-surface-muted);
        }

        .password-toggle:focus-visible {
          outline: 2px solid var(--ripnel-accent);
          outline-offset: 1px;
        }

        .toggle-icon {
          width: 0.9375rem;
          height: 0.9375rem;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1.4;
        }

        .alert-warning {
          background: var(--color-warning-bg, #fffbeb);
          border: 1px solid var(--color-warning-border, #fcd34d);
          color: var(--color-warning-text, #b45309);
        }

        .alert-danger {
          background: var(--color-danger-bg, #fff1f2);
          border: 1px solid var(--color-danger-border, #fda4af);
          color: var(--color-danger-text, #be123c);
        }

        .dark .alert-warning {
          background: rgb(245 158 11 / 0.12);
          border-color: rgb(245 158 11 / 0.3);
          color: rgb(253 230 138);
        }

        .dark .alert-danger {
          background: rgb(244 63 94 / 0.12);
          border-color: rgb(244 63 94 / 0.3);
          color: rgb(254 205 211);
        }

        .alert-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
          margin-top: 0.0625rem;
        }

        .login-button {
          height: 2.75rem;
          width: 100%;
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0;
          border-radius: 0.625rem;
          margin-top: 0.5rem;
        }

        .btn-spinner {
          width: 1rem;
          height: 1rem;
        }

        @media (prefers-reduced-motion: no-preference) {
          .btn-spinner {
            animation: spin 0.7s linear infinite;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .login-footer {
          font-size: 0.6875rem;
          color: var(--ops-text-muted);
          text-align: center;
          opacity: 0.55;
        }

        .login-back {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1;
          color: color-mix(in srgb, var(--ops-text-muted) 55%, transparent);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.375rem 0.5rem;
          border-radius: 0.5rem;
          transition:
            color 160ms ease,
            background-color 160ms ease;
          z-index: 10;
        }

        .login-back:hover {
          color: var(--ops-text);
          background: var(--ops-surface-muted);
        }

        .back-icon {
          width: 0.875rem;
          height: 0.875rem;
          flex-shrink: 0;
        }

        @media (max-width: 639px) {
          .login-back {
            top: 1rem;
            left: 1rem;
            font-size: 0.75rem;
            padding: 0.3125rem 0.4375rem;
          }
        }

        .login-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.125rem;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          user-select: none;
        }

        .login-remember input[type="checkbox"] {
          width: 0.9375rem;
          height: 0.9375rem;
          accent-color: var(--ripnel-accent);
          cursor: pointer;
          border-radius: 0.25rem;
          margin: 0;
        }

        .login-remember-label {
          font-size: 0.8125rem;
          color: var(--ops-text-muted);
          line-height: 1;
        }

        .login-forgot {
          font-size: 0.8125rem;
          color: color-mix(in srgb, var(--ops-text-muted) 65%, transparent);
          text-decoration: none;
          font-weight: 500;
          transition: color 160ms ease;
        }

        .login-forgot:hover {
          color: var(--ripnel-accent);
        }

        .dark .login-bg-accent {
          background: radial-gradient(
            ellipse 80% 50% at 50% 0%,
            rgb(142 93 183 / 0.04) 0%,
            transparent 60%
          );
        }
      `}</style>
    </div>
  )
}