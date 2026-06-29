/** Product status union shared across product overview and variants pages */
export type ProductStatus =
  | "inactive"
  | "draft"
  | "pending_variants"
  | "pending_prices"
  | "ready_no_stock"
  | "ready";

/** Generic filter for active/inactive status lists */
export type StatusFilter = "all" | "active" | "inactive";

/** Generic catalog entity (garment types, fabrics, sizes, colors, etc.) */
export type CatalogItem = {
  [key: string]: unknown;
  active?: boolean;
  code?: string | null;
  name?: string | null;
  hex?: string | null;
  sort_order?: number | null;
};

/** Shared base fields for a product style (used across styles, variants, and overview) */
export type StyleBase = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_name: string;
};
