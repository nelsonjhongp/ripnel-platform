import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AUTH_BACK_BUTTON_TEXT, AUTH_CARD_BORDER } from "./auth-constants"
import { LOGIN } from "./login-messages"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  children: ReactNode
  onBack?: () => void
  footer?: ReactNode
}

export function AuthShell({ children, onBack, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[var(--ops-page-background)] px-4 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className={`absolute left-4 top-4 z-10 gap-1.5 rounded-lg px-2.5 text-[0.8125rem] ${AUTH_BACK_BUTTON_TEXT} hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] sm:left-5 sm:top-5 md:left-6 md:top-6`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{LOGIN.actions.back}</span>
        </Button>
      ) : null}

      <div className="relative z-10 flex w-full max-w-[400px] animate-[cardEntrance_400ms_ease-out] flex-col items-center gap-4 sm:gap-5">
        {children}
        {footer ? (
          <p className="text-center text-[0.6875rem] text-[var(--ops-text-muted)] opacity-50">{footer}</p>
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
        `w-full gap-0 rounded-[1.125rem] ${AUTH_CARD_BORDER} bg-[var(--ops-surface)] py-0 shadow-sm dark:border-[var(--ops-border-strong)]`,
        className
      )}
    >
      <CardHeader className="items-center px-5 pb-0 pt-7 text-center sm:px-7 sm:pt-8">
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

      <CardContent className="px-5 pb-7 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
        {children}
      </CardContent>
    </Card>
  )
}
