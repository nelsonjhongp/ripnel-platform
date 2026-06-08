"use client"

import Link from "next/link"
import * as React from "react"
import { Bell, ChevronRight, RefreshCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useTopbarNotifications, type TopbarNotificationItem } from "./NotificationsProvider"
import { formatDateTime } from "@/lib/date-utils"

function severityClasses(severity: TopbarNotificationItem["severity"]) {
  if (severity === "danger") return "sales-chip-danger"
  if (severity === "warning") return "sales-chip-warning"
  return "sales-chip-neutral"
}

function severityLabel(severity: TopbarNotificationItem["severity"]) {
  if (severity === "danger") return "Critica"
  if (severity === "warning") return "Atencion"
  return "Info"
}

export function TopbarNotifications() {
  const { notifications, loading, refreshing, error, refresh } = useTopbarNotifications()
  const summary = notifications?.summary
  const items = notifications?.items || []
  const total = summary?.total || 0
  const hasDanger = (summary?.danger_count || 0) > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "relative rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] shadow-sm transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]",
            total > 0 &&
              "text-[var(--ops-text)] ring-1 ring-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,transparent)]"
          )}
          aria-label={total > 0 ? `${total} alertas operativas` : "Sin alertas operativas"}
        >
          <Bell className={cn("h-4 w-4", refreshing && "animate-pulse")} />
          {total > 0 ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full border px-1 text-[10px] font-semibold leading-none",
                hasDanger
                  ? "border-rose-200 bg-rose-500 text-white dark:border-rose-400/30 dark:bg-rose-500 dark:text-white"
                  : "border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)] bg-[var(--ripnel-accent)] text-white"
              )}
            >
              {total > 9 ? "9+" : total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="ops-picker-popover w-[22rem] overflow-hidden rounded-2xl p-0">
        <div className="border-b border-[var(--ops-border-soft)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
                Topbar
              </p>
              <h3 className="mt-1 text-sm font-semibold text-[var(--ops-text)]">Alertas operativas</h3>
              <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                {total > 0
                  ? `${summary?.danger_count || 0} críticas · ${summary?.warning_count || 0} de atención`
                  : "Sin pendientes inmediatos en tu sede activa."}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
              onClick={() => void refresh({ silent: true })}
              aria-label="Actualizar alertas"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {loading && !notifications ? (
          <div className="px-4 py-4 text-sm text-[var(--ops-text-muted)]">Cargando alertas operativas…</div>
        ) : null}

        {!loading && error && !notifications ? (
          <div className="px-4 py-4">
            <div className="sales-chip sales-chip-warning rounded-xl px-3 py-2 text-xs">{error}</div>
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="px-4 py-4">
            <div className="ops-empty-state-compact rounded-xl px-3 py-3 text-sm">
              No hay alertas operativas.
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="max-h-[24rem] overflow-y-auto p-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group block rounded-xl border border-transparent px-3 py-3 transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,transparent)] hover:bg-[var(--ops-surface-muted)]"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold", severityClasses(item.severity))}>
                    {severityLabel(item.severity)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">{item.title}</p>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-text-muted)] transition group-hover:text-[var(--ripnel-accent-hover)]" />
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ops-text-muted)]">
                      {item.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-muted)]">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ops-border-soft)] px-2 py-0.5">
                        <TriangleAlert className="h-3 w-3" />
                        {item.action_label}
                      </span>
                      <span>{formatDateTime(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
