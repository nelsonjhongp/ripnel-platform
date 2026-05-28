"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
import { fetchCatalogHubState } from "@/lib/api-catalogs"
import type { CatalogHubCount } from "@/lib/api-catalogs"
import {
  catalogPageDefinitions,
  getCatalogRoute,
} from "@/lib/product-master-metadata"

function getSetupStatus(total: number) {
  if (total > 0) {
    return {
      label: "Listo",
      className:
        "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]",
    }
  }

  return {
    label: "Pendiente",
    className:
      "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]",
  }
}

export function CatalogHubPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<Record<string, CatalogHubCount>>({})

  async function loadHub() {
    setLoading(true)
    setError(null)

    try {
      setCatalogs(await fetchCatalogHubState())
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar catalogos maestros"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadHub()
    })
  }, [])

  return (
    <TooltipProvider delayDuration={120}>
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
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
                  onClick={loadHub}
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
            const status = getSetupStatus(count.total)
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
                        <span className={`inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${definition.accentCountClassName}`}>
                          {count.total}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{definition.shortDescription}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
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
      </div>
    </section>
    </TooltipProvider>
  )
}
