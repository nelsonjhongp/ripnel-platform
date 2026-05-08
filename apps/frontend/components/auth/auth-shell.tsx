import type { ReactNode } from "react"
import { ArrowLeft, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  children: ReactNode
  onBack?: () => void
  footer?: ReactNode
}

export function AuthShell({ children, onBack, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ops-page-background)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgb(176_122_228_/_0.06)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgb(142_93_183_/_0.04)_0%,transparent_60%)]"
      />

      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="absolute left-4 top-4 z-10 gap-1.5 rounded-lg px-2.5 text-[0.8125rem] text-[color:color-mix(in_srgb,var(--ops-text-muted)_55%,transparent)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] md:left-6 md:top-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver</span>
        </Button>
      ) : null}

      <div className="relative z-10 flex w-full max-w-[416px] animate-[cardEntrance_400ms_ease-out] flex-col items-center gap-[1.125rem] px-4 py-6 sm:px-6">
        {children}
        {footer ? (
          <p className="text-center text-[0.6875rem] text-[var(--ops-text-muted)] opacity-55">{footer}</p>
        ) : null}
      </div>
    </div>
  )
}

type AuthCardProps = {
  logo?: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function AuthCard({
  logo,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        "w-full gap-0 rounded-[1.25rem] border border-[color:color-mix(in_srgb,var(--ops-border-strong)_80%,var(--ripnel-accent)_20%)] bg-[var(--ops-surface)] py-0 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_rgb(15_23_42_/_0.06)] dark:border-[var(--ops-border-strong)] dark:shadow-[0_1px_3px_rgb(0_0_0_/_0.12),0_8px_24px_rgb(0_0_0_/_0.2)]",
        className
      )}
    >
      <CardHeader className="items-center px-6 pb-0 pt-8 text-center sm:px-9">
        {logo ? <div className="mb-2 flex items-center justify-center">{logo}</div> : null}
        {eyebrow ? (
          <p className="mb-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-[var(--ripnel-accent)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="text-[1.375rem] leading-[1.2] font-bold tracking-[-0.015em] text-[var(--ops-text)]">
          {title}
        </CardTitle>
        {subtitle ? (
          <CardDescription className="mt-1 text-[0.8125rem] leading-[1.4] text-[var(--ops-text-muted)]">
            {subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="px-6 pb-8 pt-8 sm:px-9">
        {children}
      </CardContent>
    </Card>
  )
}

type AuthAlertProps = {
  tone: "warning" | "danger"
  children: ReactNode
}

export function AuthAlert({ tone, children }: AuthAlertProps) {
  const toneClasses =
    tone === "warning"
      ? "border-[var(--color-warning-border,#fcd34d)] bg-[var(--color-warning-bg,#fffbeb)] text-[var(--color-warning-text,#b45309)] dark:border-[rgb(245_158_11_/_0.3)] dark:bg-[rgb(245_158_11_/_0.12)] dark:text-[rgb(253_230_138)]"
      : "border-[var(--color-danger-border,#fda4af)] bg-[var(--color-danger-bg,#fff1f2)] text-[var(--color-danger-text,#be123c)] dark:border-[rgb(244_63_94_/_0.3)] dark:bg-[rgb(244_63_94_/_0.12)] dark:text-[rgb(254_205_211)]"

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[0.8125rem] font-medium leading-[1.4]", toneClasses)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

type AuthFieldProps = {
  label: string
  htmlFor: string
  children: ReactNode
}

export function AuthField({ label, htmlFor, children }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[0.75rem] leading-[1.3] font-medium text-[var(--ops-text)]"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
