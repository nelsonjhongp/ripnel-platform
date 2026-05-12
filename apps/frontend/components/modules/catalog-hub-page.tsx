"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { buildApiUrl } from "@/lib/api"
import {
  catalogPageDefinitions,
  getCatalogRoute,
} from "@/lib/product-master-metadata"

type CatalogHubCount = {
  total: number
  active: number
}

async function requestCount(endpoint: string) {
  const response = await fetch(buildApiUrl(endpoint), {
    cache: "no-store",
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar el modulo")
  }

  const items = Array.isArray(payload.data)
    ? (payload.data as Array<{ active?: boolean }>)
    : []

  return {
    total: items.length,
    active: items.filter((item) => item?.active !== false).length,
  }
}

async function requestHubState(): Promise<Record<string, CatalogHubCount>> {
  const catalogEntries = await Promise.all(
    catalogPageDefinitions.map(async (definition) => {
      const count = await requestCount(definition.endpoint)
      return [definition.slug, count] as const
    })
  )

  return Object.fromEntries(catalogEntries)
}

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
      setCatalogs(await requestHubState())
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
    loadHub()
  }, [])

  return (
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <PosHeader
          eyebrow="Catalogos"
          title="Catalogos maestros"
          actions={
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={loadHub}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Actualizar
            </Button>
          }
        />

        <div className="border-t border-[var(--ops-border-strong)] pt-4" />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
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
                className={`group ops-surface-muted flex min-h-[88px] cursor-pointer items-center rounded-2xl border px-4 py-4 transition-[border-color,background-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 ${definition.accentHoverClassName}`}
              >
                <div className="flex w-full items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-[var(--ops-surface)] ${definition.accentRingClassName} ${definition.accentClassName}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="ops-title truncate text-base font-semibold">{definition.shortLabel}</h2>
                        <span className={`inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${definition.accentCountClassName}`}>
                          {count.total}
                        </span>
                      </div>
                      <p className="ops-text-muted mt-1 text-sm">{definition.shortDescription}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--ops-surface)] transition-transform group-hover:translate-x-0.5 ${definition.accentRingClassName} ${definition.accentClassName}`}>
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
  )
}
