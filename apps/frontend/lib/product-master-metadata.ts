import type { LucideIcon } from "lucide-react"
import {
  Boxes,
  ChevronRight,
  Palette,
  ReceiptText,
  Ruler,
  Shapes,
  Shirt,
  ShoppingBag,
  Warehouse,
} from "lucide-react"

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
  {
    slug: "telas",
    label: "Telas",
    shortLabel: "Telas",
    shortDescription: "Base comercial del style.",
    nextStepLabel: "Dejar telas frecuentes listas antes del alta masiva.",
    endpoint: "/api/fabrics",
    emptyTitle: "Aun no hay telas",
    emptyDescription: "Carga telas base como French Terry, Full Licra, Suplex o Rip.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "FT",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "French Terry",
      },
    ],
    listFields: [],
    idKey: "fabric_id",
    icon: Boxes,
    duplicateStrategy: "name+code",
    createDescription: "Carga telas frecuentes y evita variantes del mismo nombre.",
    editDescription: "Ajusta nombre o estado sin alterar el codigo de la tela.",
    accentClassName: "text-rose-500 dark:text-rose-300",
    accentRingClassName: "border-rose-300/55 dark:border-rose-800/70",
    accentHoverClassName: "hover:border-rose-400/70 focus-visible:ring-rose-400/20",
    accentCountClassName: "border-rose-300/45 text-rose-700 dark:border-rose-800/65 dark:text-rose-200",
    entryIcon: ChevronRight,
  },
  {
    slug: "detalle-de-tela",
    label: "Detalle de tela",
    shortLabel: "Detalle de tela",
    shortDescription: "Calificadores opcionales del style.",
    nextStepLabel: "Cargar solo lo que realmente ayuda a diferenciar productos.",
    endpoint: "/api/fabric-details",
    emptyTitle: "Aun no hay detalles de tela",
    emptyDescription: "Este catalogo es opcional. Cargalo solo cuando agregue valor operativo.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "PER",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Perchado",
      },
    ],
    listFields: [],
    idKey: "fabric_detail_id",
    icon: Shapes,
    duplicateStrategy: "name+code",
    createDescription: "Agrega solo detalles que realmente diferencien la tela.",
    editDescription: "Actualiza detalle o estado sin tocar el codigo base.",
    accentClassName: "text-fuchsia-500 dark:text-fuchsia-300",
    accentRingClassName: "border-fuchsia-300/55 dark:border-fuchsia-800/70",
    accentHoverClassName: "hover:border-fuchsia-400/70 focus-visible:ring-fuchsia-400/20",
    accentCountClassName: "border-fuchsia-300/45 text-fuchsia-700 dark:border-fuchsia-800/65 dark:text-fuchsia-200",
    entryIcon: ChevronRight,
  },
  {
    slug: "targets",
    label: "Targets",
    shortLabel: "Targets",
    shortDescription: "Segmentacion comercial opcional.",
    nextStepLabel: "Usarlo solo si cambia una decision comercial real.",
    endpoint: "/api/targets",
    emptyTitle: "Aun no hay targets",
    emptyDescription: "Crea targets solo cuando ayuden a ordenar el catalogo comercial.",
    fields: [
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Unisex",
        editableOnUpdate: false,
      },
    ],
    listFields: [],
    idKey: "target_id",
    icon: ShoppingBag,
    duplicateStrategy: "name",
    createDescription: "Crea targets solo si ayudan a ordenar el catalogo comercial.",
    editDescription: "Mantiene el target sin duplicar nombres existentes.",
    accentClassName: "text-emerald-500 dark:text-emerald-300",
    accentRingClassName: "border-emerald-300/55 dark:border-emerald-800/70",
    accentHoverClassName: "hover:border-emerald-400/70 focus-visible:ring-emerald-400/20",
    accentCountClassName: "border-emerald-300/45 text-emerald-700 dark:border-emerald-800/65 dark:text-emerald-200",
    entryIcon: ChevronRight,
  },
]

export const catalogPageBySlug = Object.fromEntries(
  catalogPageDefinitions.map((definition) => [definition.slug, definition])
) as Record<string, CatalogPageDefinition>

export const productMasterLinks: ProductMasterLink[] = [
  {
    href: "/productos",
    label: "Resumen",
    shortDescription: "Seguimiento general del maestro de producto.",
    nextStepLabel: "Detectar que styles requieren completar variantes o precios.",
    icon: Warehouse,
  },
  {
    href: "/productos/estilos",
    label: "Estilos",
    shortDescription: "Alta y mantenimiento del style base.",
    nextStepLabel: "Despues de crear un style, continuar en Variantes.",
    icon: Shirt,
  },
  {
    href: "/productos/variantes",
    label: "Variantes",
    shortDescription: "Configuracion de tallas, colores y SKU por combinacion.",
    nextStepLabel: "Cerrar configuracion antes de cargar precios y stock.",
    icon: Shapes,
  },
]

export function resolveProductMasterRouteTitle(pathname: string) {
  if (pathname === "/catalogos") {
    return "Catalogos maestros"
  }

  if (pathname.startsWith("/catalogos/")) {
    const slug = pathname.split("/")[2]
    return catalogPageBySlug[slug]?.label || null
  }

  if (pathname === "/productos") {
    return "Maestro de producto"
  }

  const matchedProductLink = productMasterLinks.find((link) => link.href === pathname)
  if (matchedProductLink) {
    return matchedProductLink.label === "Resumen"
      ? "Maestro de producto"
      : `${matchedProductLink.label} de producto`
  }

  if (pathname.startsWith("/productos/")) {
    const slug = pathname.split("/")[2]
    if (slug === "estilos") return "Estilos de producto"
    if (slug === "variantes") return "Variantes de producto"
  }

  return null
}

export function getCatalogRoute(slug: string) {
  return `/catalogos/${slug}`
}

export const productMasterSummaryLink = {
  href: "/catalogos",
  label: "Catalogos maestros",
  icon: ReceiptText,
}
