import type { LucideIcon } from "lucide-react"
import {
  ChevronRight,
  Palette,
  Plus,
  ReceiptText,
  Ruler,
  Shapes,
  Shirt,
  Warehouse,
} from "lucide-react"
import { appRoutes, buildCatalogRoute, buildProductModuleRoute, productRouteSlugs } from "@/lib/routes"

export type CatalogFieldConfig = {
  key: string
  label: string
  type: "text" | "number" | "textarea" | "color"
  placeholder?: string
  helper?: string
  editableOnUpdate?: boolean
}

export type CatalogListFieldConfig = {
  key: string
  label: string
  render?: "text" | "hex"
}

export type CatalogPageDefinition = {
  slug: string
  label: string
  shortLabel: string
  entityLabel: string
  shortDescription: string
  nextStepLabel: string
  endpoint: string
  emptyTitle: string
  emptyDescription: string
  fields: CatalogFieldConfig[]
  listFields: CatalogListFieldConfig[]
  idKey: string
  icon: LucideIcon
  duplicateStrategy: "name" | "name+code"
  createDescription: string
  editDescription: string
  accentClassName: string
  accentRingClassName: string
  accentHoverClassName: string
  accentCountClassName: string
  entryIcon: LucideIcon
}

export type ProductMasterLink = {
  href: string
  label: string
  shortDescription: string
  nextStepLabel: string
  icon: LucideIcon
}

export const catalogPageDefinitions: CatalogPageDefinition[] = [
  {
    slug: "tallas",
    label: "Tallas",
    shortLabel: "Tallas",
    entityLabel: "talla",
    shortDescription: "Base para styles, variantes y precios.",
    nextStepLabel: "Completar styles con tallas permitidas.",
    endpoint: "/api/sizes",
    emptyTitle: "Aun no hay tallas",
    emptyDescription: "Empieza por ST, S, M, L, XL y XXL para habilitar el maestro de producto.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "ST",
        helper: "Si lo dejas vacio, el backend genera un codigo corto.",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Estandar",
      },
      {
        key: "sort_order",
        label: "Orden",
        type: "number",
        placeholder: "10",
      },
      {
        key: "description",
        label: "Descripcion",
        type: "textarea",
        placeholder: "Uso operativo de la talla",
      },
    ],
    listFields: [
      { key: "sort_order", label: "Orden" },
      { key: "description", label: "Descripcion" },
    ],
    idKey: "size_id",
    icon: Ruler,
    duplicateStrategy: "name+code",
    createDescription: "Registra tallas base antes de configurar estilos y variantes.",
    editDescription: "Ajusta nombre, orden o estado sin tocar el codigo base.",
    accentClassName: "text-sky-500 dark:text-sky-300",
    accentRingClassName: "border-sky-300/55 dark:border-sky-800/70",
    accentHoverClassName: "hover:border-sky-400/70 focus-visible:ring-sky-400/20",
    accentCountClassName: "border-sky-300/45 text-sky-700 dark:border-sky-800/65 dark:text-sky-200",
    entryIcon: ChevronRight,
  },
  {
    slug: "colores",
    label: "Colores",
    shortLabel: "Colores",
    entityLabel: "color",
    shortDescription: "Colores comerciales y tecnicos.",
    nextStepLabel: "Dejar UNICO listo para casos sin color comercial.",
    endpoint: "/api/colors",
    emptyTitle: "Aun no hay colores",
    emptyDescription: "Carga colores base y agrega UNICO para no bloquear el alta de productos.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "NEG",
        helper: "Si lo dejas vacio, el backend genera un codigo corto.",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Negro",
      },
      {
        key: "hex",
        label: "Hex",
        type: "text",
        placeholder: "#000000",
      },
    ],
    listFields: [{ key: "hex", label: "Hex", render: "hex" }],
    idKey: "color_id",
    icon: Palette,
    duplicateStrategy: "name+code",
    createDescription: "Carga colores operativos y deja UNICO disponible para excepciones.",
    editDescription: "Ajusta nombre, hex o estado sin alterar el codigo.",
    accentClassName: "text-violet-500 dark:text-violet-300",
    accentRingClassName: "border-violet-300/55 dark:border-violet-800/70",
    accentHoverClassName: "hover:border-violet-400/70 focus-visible:ring-violet-400/20",
    accentCountClassName: "border-violet-300/45 text-violet-700 dark:border-violet-800/65 dark:text-violet-200",
    entryIcon: ChevronRight,
  },
  {
    slug: "tipo-prenda",
    label: "Tipo de prenda",
    shortLabel: "Tipo de prenda",
    entityLabel: "tipo de prenda",
    shortDescription: "Familias base del style.",
    nextStepLabel: "Usar familias limpias antes de cargar estilos.",
    endpoint: "/api/garment-types",
    emptyTitle: "Aun no hay tipos de prenda",
    emptyDescription: "Registra familias base como Polo, Top, Jogger, Legging o Short.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "JOG",
        helper: "Si lo dejas vacio, el backend genera un codigo corto.",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Jogger",
      },
    ],
    listFields: [],
    idKey: "garment_type_id",
    icon: Shirt,
    duplicateStrategy: "name+code",
    createDescription: "Define familias base limpias antes de crear styles.",
    editDescription: "Mantiene la familia base sin tocar el codigo identitario.",
    accentClassName: "text-amber-500 dark:text-amber-300",
    accentRingClassName: "border-amber-300/55 dark:border-amber-800/70",
    accentHoverClassName: "hover:border-amber-400/70 focus-visible:ring-amber-400/20",
    accentCountClassName: "border-amber-300/45 text-amber-700 dark:border-amber-800/65 dark:text-amber-200",
    entryIcon: ChevronRight,
  },
]

export const catalogPageBySlug = Object.fromEntries(
  catalogPageDefinitions.map((definition) => [definition.slug, definition])
) as Record<string, CatalogPageDefinition>

export const productMasterLinks: ProductMasterLink[] = [
  {
    href: appRoutes.products,
    label: "Resumen",
    shortDescription: "Seguimiento general del maestro de producto.",
    nextStepLabel: "Detectar que styles requieren completar variantes o precios.",
    icon: Warehouse,
  },
  {
    href: `${appRoutes.products}/nuevo`,
    label: "Nuevo",
    shortDescription: "Alta rapida de style con tallas y colores iniciales.",
    nextStepLabel: "Crear variantes y continuar con precios.",
    icon: Plus,
  },
  {
    href: buildProductModuleRoute(productRouteSlugs.styles),
    label: "Estilos",
    shortDescription: "Alta y mantenimiento del style base.",
    nextStepLabel: "Despues de crear un style, continuar en Variantes.",
    icon: Shirt,
  },
  {
    href: buildProductModuleRoute(productRouteSlugs.variants),
    label: "Variantes",
    shortDescription: "Configuracion de tallas, colores y SKU por combinacion.",
    nextStepLabel: "Cerrar configuracion antes de cargar precios y stock.",
    icon: Shapes,
  },
]

export function resolveProductMasterRouteTitle(pathname: string) {
  if (pathname === appRoutes.catalogs) {
    return "Catálogos maestros"
  }

  if (pathname.startsWith(`${appRoutes.catalogs}/`)) {
    const slug = pathname.split("/")[2]
    return catalogPageBySlug[slug]?.label || null
  }

  if (pathname === appRoutes.products) {
    return "Maestro de producto"
  }

  const matchedProductLink = productMasterLinks.find((link) => link.href === pathname)
  if (matchedProductLink) {
    if (matchedProductLink.href === `${appRoutes.products}/nuevo`) return "Nuevo producto"
    return matchedProductLink.label === "Resumen"
      ? "Maestro de producto"
      : `${matchedProductLink.label} de producto`
  }

  if (pathname.startsWith(`${appRoutes.products}/`)) {
    const slug = pathname.split("/")[2]
    if (slug === "nuevo") return "Nuevo producto"
    if (slug === productRouteSlugs.styles) return "Estilos de producto"
    if (slug === productRouteSlugs.variants) return "Variantes de producto"
  }

  return null
}

export function getCatalogRoute(slug: string) {
  return buildCatalogRoute(slug)
}

export const productMasterSummaryLink = {
  href: appRoutes.catalogs,
  label: "Catálogos maestros",
  icon: ReceiptText,
}
