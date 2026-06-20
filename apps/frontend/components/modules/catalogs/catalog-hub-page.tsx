"use client"

import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { AdminInlineMessage } from "@/components/admin/admin-ui"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { useApiGet } from "@/hooks/use-api-get"
import { fetchCatalogHubState } from "@/lib/api-catalogs"
import {
  catalogPageDefinitions,
  getCatalogRoute,
} from "@/lib/product-master-metadata"

function getHubStatus(total: number): { tone: "success" | "neutral"; label: string } {
  return total > 0
    ? { tone: "success", label: "Listo" }
    : { tone: "neutral", label: "Pendiente" }
}

export function CatalogHubPage() {
  const { data: hubCounts, loading, error, refetch } = useApiGet(
    () => fetchCatalogHubState(),
    []
  )

  const catalogs = hubCounts ?? {}

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Catálogos"
          title="Catálogos maestros"
          actions={
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={() => refetch()}
                  disabled={loading}
                  aria-label="Actualizar catálogos"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Actualizar
              </TooltipContent>
            </Tooltip>
          }
        />

        <div className="border-t border-[var(--ops-border-strong)] pt-4" />

        {error ? (
          <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catalogPageDefinitions.map((definition) => {
            const count = catalogs[definition.slug] || { total: 0, active: 0 }
            const status = getHubStatus(count.total)
            const Icon = definition.icon
            const EntryIcon = definition.entryIcon

            return (
              <Link
                key={definition.slug}
                href={getCatalogRoute(definition.slug)}
                className={`group flex min-h-[88px] cursor-pointer items-center rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-4 transition hover:bg-[var(--ops-surface)] focus-visible:outline-none focus-visible:ring-2 ${definition.accentHoverClassName}`}
              >
                <div className="flex w-full items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-[var(--ops-surface)] ${definition.accentRingClassName} ${definition.accentClassName}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-[var(--ops-text)]">{definition.shortLabel}</h2>
                        <OpsMetricInlineGroup items={[{ label: "", value: count.total, tone: "accent" }]} />
                      </div>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{definition.shortDescription}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <OpsStatusBadge tone={status.tone}>{status.label}</OpsStatusBadge>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-[var(--ops-surface)] transition group-hover:translate-x-0.5 ${definition.accentRingClassName} ${definition.accentClassName}`}>
                        <EntryIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </OpsPageShell>
    </TooltipProvider>
  )
}
