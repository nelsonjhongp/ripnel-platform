import { apiFetch, buildApiUrl, unwrapApiData } from "@/lib/api"
import type {
  PriceCatalogRow,
  PriceCoverageGap,
  PriceRow,
  PriceWorkspace,
  PricingRuleRow,
  ProductSummary,
  ProductsResponse,
} from "@/lib/prices-types"

export async function fetchPriceCatalog(params?: {
  q?: string
  coverage?: string
  status?: string
}): Promise<PriceCatalogRow[]> {
  const searchParams = new URLSearchParams()

  if (params?.q) searchParams.set("q", params.q)
  if (params?.coverage) searchParams.set("coverage", params.coverage)
  if (params?.status) searchParams.set("status", params.status)

  const qs = searchParams.toString()
  const envelope = await apiFetch<{ ok: boolean; data: PriceCatalogRow[] }>(
    `/api/prices/catalog${qs ? `?${qs}` : ""}`,
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope) ?? []
}

export async function fetchPrices(params?: {
  style_id?: string
  price_type?: string
  active?: string | boolean
  q?: string
}): Promise<PriceRow[]> {
  const searchParams = new URLSearchParams()

  if (params?.style_id) searchParams.set("style_id", params.style_id)
  if (params?.price_type) searchParams.set("price_type", params.price_type)
  if (params?.active !== undefined) searchParams.set("active", String(params.active))
  if (params?.q) searchParams.set("q", params.q)

  const qs = searchParams.toString()
  const envelope = await apiFetch<{ ok: boolean; data: PriceRow[] }>(
    `/api/prices${qs ? `?${qs}` : ""}`,
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope) ?? []
}

export async function fetchPriceWorkspace(styleId: string): Promise<PriceWorkspace> {
  const envelope = await apiFetch<{ ok: boolean; data: PriceWorkspace }>(
    `/api/prices/workspace/${styleId}`,
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope)
}

export async function createPrice(body: Record<string, unknown>): Promise<PriceRow> {
  const envelope = await apiFetch<{ ok: boolean; data: PriceRow }>(
    buildApiUrl("/api/prices"),
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )

  return unwrapApiData(envelope)
}

export async function updatePrice(
  priceId: string,
  body: Record<string, unknown>
): Promise<PriceRow> {
  const envelope = await apiFetch<{ ok: boolean; data: PriceRow }>(
    buildApiUrl(`/api/prices/${priceId}`),
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )

  return unwrapApiData(envelope)
}

export async function fetchPriceCoverageGaps(): Promise<PriceCoverageGap[]> {
  const envelope = await apiFetch<{ ok: boolean; data: PriceCoverageGap[] }>(
    "/api/prices/coverage-gaps",
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope) ?? []
}

export async function fetchPricingRules(): Promise<PricingRuleRow[]> {
  const envelope = await apiFetch<{ ok: boolean; data: PricingRuleRow[] }>(
    "/api/pricing-rules",
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope) ?? []
}

export async function createPricingRule(
  body: Record<string, unknown>
): Promise<PricingRuleRow> {
  const envelope = await apiFetch<{ ok: boolean; data: PricingRuleRow }>(
    buildApiUrl("/api/pricing-rules"),
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )

  return unwrapApiData(envelope)
}

export async function updatePricingRule(
  ruleId: string,
  body: Record<string, unknown>
): Promise<PricingRuleRow> {
  const envelope = await apiFetch<{ ok: boolean; data: PricingRuleRow }>(
    buildApiUrl(`/api/pricing-rules/${ruleId}`),
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )

  return unwrapApiData(envelope)
}

export async function fetchProducts(params?: {
  q?: string
  filter_mode?: string
  page?: number
  page_size?: number
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams()

  if (params?.q) searchParams.set("q", params.q)
  if (params?.filter_mode) searchParams.set("filter_mode", params.filter_mode)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.page_size) searchParams.set("page_size", String(params.page_size))

  const qs = searchParams.toString()
  const envelope = await apiFetch<{ ok: boolean; data: ProductsResponse }>(
    `/api/products${qs ? `?${qs}` : ""}`,
    { suppressAuthEvent: true }
  )

  return unwrapApiData(envelope)
}

export async function fetchAllProducts(): Promise<ProductSummary[]> {
  const response = await fetchProducts({ page: 1, page_size: 50 })
  return response.items ?? []
}
