"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HomeHeaderAction {
  key: string
  label: string
  href: string
  icon: ReactNode
  variant?: "accent" | "outline"
}

export function HomeHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: string
  actions: HomeHeaderAction[]
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ops-text)] md:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{subtitle}</p>
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant ?? "outline"}
              size="sm"
              className="rounded-full px-4"
              asChild
            >
              <Link href={action.href}>
                <span className={cn("h-4 w-4", "[&_svg]:h-4 [&_svg]:w-4")}>
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      )}
    </header>
  )
}
