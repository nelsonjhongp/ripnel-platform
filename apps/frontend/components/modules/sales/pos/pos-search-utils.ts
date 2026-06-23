import type {
  GroupedStyle,
  SaleVariant,
  SearchableStyle,
} from "./pos-types"

export function groupVariantsByStyle(variants: SaleVariant[]): GroupedStyle[] {
  const grouped = new Map<string, GroupedStyle>()

  for (const variant of variants) {
    if (!grouped.has(variant.style_id)) {
      grouped.set(variant.style_id, {
        style_id: variant.style_id,
        style_name: variant.style_name,
        style_code: variant.style_code,
        variants: [],
      })
    }

    grouped.get(variant.style_id)!.variants.push(variant)
  }

  return Array.from(grouped.values())
}

function normalizeSearchValue(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

function getStyleSearchMeta(
  style: GroupedStyle,
  rawQuery: string,
  searchScope: string
): { matches: boolean; rank: number } {
  const query = normalizeSearchValue(rawQuery)
  if (!query) {
    return { matches: true, rank: 2 }
  }

  const styleName = normalizeSearchValue(style.style_name)
  const styleCode = normalizeSearchValue(style.style_code)
  const variantSkus = (style.variants || []).map((variant) =>
    normalizeSearchValue(variant.sku)
  )

  const exactCodeMatch =
    styleCode === query || variantSkus.some((sku) => sku === query)
  const partialCodeMatch =
    (styleCode && styleCode.includes(query)) ||
    variantSkus.some((sku) => sku.includes(query))
  const nameMatch = styleName.includes(query)

  if (searchScope === "code") {
    if (exactCodeMatch) return { matches: true, rank: 0 }
    if (partialCodeMatch) return { matches: true, rank: 1 }
    return { matches: false, rank: 99 }
  }

  if (searchScope === "name") {
    return { matches: nameMatch, rank: nameMatch ? 2 : 99 }
  }

  if (exactCodeMatch) return { matches: true, rank: 0 }
  if (partialCodeMatch) return { matches: true, rank: 1 }
  if (nameMatch) return { matches: true, rank: 2 }

  return { matches: false, rank: 99 }
}

export function buildProductSearchResults(
  styles: GroupedStyle[],
  rawQuery: string
): SearchableStyle[] {
  return styles
    .map((style) => {
      const totalStock = style.variants.reduce(
        (accumulator, variant) => accumulator + Number(variant.stock || 0),
        0
      )
      const searchMeta = getStyleSearchMeta(style, rawQuery, "all")

      return {
        ...style,
        totalStock,
        searchRank: searchMeta.rank,
        matchesScope: searchMeta.matches,
      }
    })
    .filter((style) => style.matchesScope)
    .sort((left, right) => {
      if (left.searchRank !== right.searchRank) {
        return left.searchRank - right.searchRank
      }

      const leftHasStock = left.totalStock > 0 ? 1 : 0
      const rightHasStock = right.totalStock > 0 ? 1 : 0
      if (leftHasStock !== rightHasStock) {
        return rightHasStock - leftHasStock
      }

      if (left.totalStock !== right.totalStock) {
        return right.totalStock - left.totalStock
      }

      return String(left.style_name || "").localeCompare(
        String(right.style_name || "")
      )
    })
}

export function getVariantOptionValues(
  variants: SaleVariant[],
  key: keyof SaleVariant,
  filters: Record<string, string> = {}
): string[] {
  const values = new Set<string>()

  for (const variant of variants || []) {
    const matchesFilters = Object.entries(filters).every(([filterKey, filterValue]) => {
      if (!filterValue) {
        return true
      }

      return String(variant?.[filterKey as keyof SaleVariant] || "") === String(filterValue)
    })

    if (!matchesFilters) {
      continue
    }

    const optionValue = String(variant?.[key] || "").trim()
    if (optionValue) {
      values.add(optionValue)
    }
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right))
}

export function findVariantByAttributes(
  variants: SaleVariant[],
  sizeCode: string,
  colorCode: string
): SaleVariant | null {
  if (!sizeCode || !colorCode) {
    return null
  }

  return (
    (variants || []).find(
      (variant) =>
        String(variant.size_code || "") === String(sizeCode) &&
        String(variant.color_code || "") === String(colorCode)
    ) || null
  )
}
