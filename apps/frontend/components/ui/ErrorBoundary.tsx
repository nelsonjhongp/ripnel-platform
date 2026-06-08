"use client"

import * as React from "react"
import { AlertTriangle, RefreshCcw, Home } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-surface-muted)]">
              <AlertTriangle className="h-6 w-6 text-[var(--ops-text)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
              Algo sali&oacute; mal
            </h2>
            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
              La aplicaci&oacute;n encontr&oacute; un error inesperado. Puedes intentar recuperar el estado o volver al inicio.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--ripnel-accent)_30%,transparent)] bg-[var(--ripnel-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </button>
              <a
                href="/inicio"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-2 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
              >
                <Home className="h-4 w-4" />
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
