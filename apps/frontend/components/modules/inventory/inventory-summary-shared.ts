"use client";

export type InventoryVisibleLocation = {
  location_id: string;
  name: string;
  code: string | null;
  type: string;
  active: boolean;
  is_default: boolean;
};

export type ProductStockStatus = "available" | "low" | "out" | "incomplete";
export type LocationHealthStatus = "normal" | "attention" | "critical";

export type InventoryProductSummaryRow = {
  style_id: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  stock_total: number;
  sizes_count: number;
  colors_count: number;
  locations_count: number;
  status: ProductStockStatus;
  status_label: string;
};

export type InventoryLocationSummaryRow = {
  location_id: string;
  location_name: string;
  stock_total: number;
  products_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  status: LocationHealthStatus;
  status_label: string;
};

export type InventorySummaryMeta = {
  low_stock_threshold: number;
  available_locations: InventoryVisibleLocation[];
  selected_location_id?: string | null;
  can_view_all_locations: boolean;
  scope_label?: string;
};

export type InventoryProductSummaryResponse = {
  rows: InventoryProductSummaryRow[];
  meta: InventorySummaryMeta;
};

export type InventoryLocationSummaryResponse = {
  rows: InventoryLocationSummaryRow[];
  meta: InventorySummaryMeta;
};

export type InventoryDetailLocationRow = {
  location_id: string;
  location_name: string;
  location_code: string | null;
  stock_total: number;
  variants_with_stock: number;
  status: ProductStockStatus;
  status_label: string;
};

export type InventoryDetailMatrixSize = {
  size_id: string;
  size_code: string;
};

export type InventoryDetailMatrixCell = {
  size_id: string;
  size_code: string;
  qty: number;
};

export type InventoryDetailMatrixRow = {
  color_id: string;
  color_name: string;
  total_qty: number;
  status: ProductStockStatus;
  status_label: string;
  cells: InventoryDetailMatrixCell[];
};

export type InventoryDetailResponse = {
  style: {
    style_id: string;
    style_code: string;
    style_name: string;
    garment_type_name: string | null;
  };
  summary: {
    stock_total: number;
    locations_with_stock: number;
    sizes_available: number;
    colors_available: number;
    status: ProductStockStatus;
    status_label: string;
    low_stock_threshold: number;
  };
  locations: InventoryDetailLocationRow[];
  matrix: {
    selected_location_id: string | null;
    sizes: InventoryDetailMatrixSize[];
    rows: InventoryDetailMatrixRow[];
  };
  movements: {
    enabled: boolean;
    message: string;
  };
  meta: {
    available_locations: InventoryVisibleLocation[];
    selected_location_id: string | null;
    can_view_all_locations: boolean;
  };
};

export type ProductStatusFilter = "all" | ProductStockStatus;
export type LocationStatusFilter = "all" | LocationHealthStatus;
export type InventoryView = "product" | "location";
export type InventoryDetailTab = "summary" | "locations" | "matrix" | "movements";

export function normalizeInventoryView(value: string | null): InventoryView {
  return value === "location" ? "location" : "product";
}

export function normalizeProductStatusFilter(value: string | null): ProductStatusFilter {
  if (value === "available" || value === "low" || value === "out" || value === "incomplete") {
    return value;
  }

  return "all";
}

export function normalizeLocationStatusFilter(value: string | null): LocationStatusFilter {
  if (value === "normal" || value === "attention" || value === "critical") {
    return value;
  }

  return "all";
}

export function normalizeInventoryDetailTab(value: string | null): InventoryDetailTab {
  if (value === "locations" || value === "matrix" || value === "movements") {
    return value;
  }

  return "summary";
}

export function getProductStatusTone(status: ProductStockStatus) {
  if (status === "out") return "danger" as const;
  if (status === "incomplete") return "warning" as const;
  if (status === "low") return "warning" as const;
  return "success" as const;
}

export function getLocationStatusTone(status: LocationHealthStatus) {
  if (status === "critical") return "danger" as const;
  if (status === "attention") return "warning" as const;
  return "success" as const;
}

export function formatInventoryCount(
  count: number,
  singularLabel: string,
  pluralLabel: string
) {
  return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
}

export function formatInventoryVariantsSummary(sizesCount: number, colorsCount: number) {
  return `${formatInventoryCount(sizesCount, "talla", "tallas")} · ${formatInventoryCount(colorsCount, "color", "colores")}`;
}
