import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DashboardChartCard({
  title,
  subtitle,
  action,
  children,
  height = 280,
  cardClassName,
  headerClassName,
  contentClassName,
  separatedHeader = true,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  height?: number | string
  cardClassName?: string
  headerClassName?: string
  contentClassName?: string
  separatedHeader?: boolean
}) {
  return (
    <Card className={["border border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--ops-surface)_96%,white)] py-0 shadow-[0_10px_30px_rgb(15_23_42/0.04)]", cardClassName].filter(Boolean).join(" ")}>
      <CardHeader className={[
        separatedHeader
          ? "border-b border-[color:color-mix(in_srgb,var(--ops-border-soft)_72%,transparent)]"
          : "border-b-0",
        "px-5 py-4",
        headerClassName,
      ].filter(Boolean).join(" ")}>
        <div className="space-y-1">
          <CardTitle className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ops-text)]">
            {title}
          </CardTitle>
          {subtitle ? (
            <CardDescription className="text-[12px] text-[color:color-mix(in_srgb,var(--ops-text-muted)_92%,transparent)]">
              {subtitle}
            </CardDescription>
          ) : null}
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={["px-5 py-4", contentClassName].filter(Boolean).join(" ")}>
        <div style={{ height: typeof height === "number" ? `${height}px` : height }}>{children}</div>
      </CardContent>
    </Card>
  )
}
