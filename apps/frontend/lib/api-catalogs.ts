import { apiFetch, buildApiUrl, unwrapApiData } from "@/lib/api"

export type CatalogRecord = {
  [key: string]: unknown
  active?: boolean
  name?: string
  code?: string | null
  created_at?: string
}

export type CatalogHubCount = {
  total: number
  active: number
}

export async function fetchCatalogItems(endpoint: string): Promise<CatalogRecord[]> {
  const envelope = await apiFetch<{ ok: boolean; data: CatalogRecord[] }>(endpoint)
  return unwrapApiData(envelope) ?? []
}

export async function createCatalogItem(endpoint: string, body: Record<string, unknown>): Promise<CatalogRecord> {
  const envelope = await apiFetch<{ ok: boolean; data: CatalogRecord }>(
    buildApiUrl(endpoint),
    { method: "POST", body: JSON.stringify(body) }
  )
  return unwrapApiData(envelope)
}

export async function updateCatalogItem(endpoint: string, id: string, body: Record<string, unknown>): Promise<CatalogRecord> {
  const envelope = await apiFetch<{ ok: boolean; data: CatalogRecord }>(
    buildApiUrl(`${endpoint}/${id}`),
    { method: "PATCH", body: JSON.stringify(body) }
  )
  return unwrapApiData(envelope)
}

export async function fetchCatalogHubState(): Promise<Record<string, CatalogHubCount>> {
  const { catalogPageDefinitions } = await import("@/lib/product-master-metadata")

  const entries = await Promise.all(
    catalogPageDefinitions.map(async (definition) => {
      const items = await fetchCatalogItems(definition.endpoint)
      return [
        definition.slug,
        {
          total: items.length,
          active: items.filter((item) => item?.active !== false).length,
        },
      ] as const
    })
  )

  return Object.fromEntries(entries)
}
