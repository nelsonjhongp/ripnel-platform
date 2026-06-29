import { notFound } from "next/navigation"
import { ModulePlaceholder } from "@/components/modules/shared/module-placeholder"
import { StylesPage } from "@/components/modules/products/styles-page"
import { VariantsPage } from "@/components/modules/products/variants-page"
import { productRouteSlugs } from "@/lib/routes"

// This route currently orchestrates product submodules by slug.
// `productId` is preserved for compatibility with existing navigation,
// but it does not represent a real product detail page yet.
const productPages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  [productRouteSlugs.styles]: {
    title: "Estilos de producto",
    description: "Modulo para registrar el style base comercial antes de configurar variantes.",
    bullets: [
      "Crear estilos con nombre, codigo y tipo de prenda.",
      "Mantener el nucleo comercial separado de la ficha tecnica.",
      "Visualizar estado activo y vigencia del style.",
      "Servira como nodo principal para variantes y precios.",
    ],
  },
  [productRouteSlugs.variants]: {
    title: "Variantes de producto",
    description: "Modulo operativo para configurar tallas, colores y generar SKU por combinacion.",
    bullets: [
      "Configurar tallas y colores permitidos sobre el style base.",
      "Generar SKU en lote y dejar barcode opcional.",
      "Preparar inventario, ventas y transferencias.",
      "Validar combinaciones unicas por talla y color.",
    ],
  },
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ style_id?: string | string[] }>
}) {
  const { productId } = await params
  const resolvedSearchParams = await searchParams
  const styleIdParam = resolvedSearchParams.style_id
  const initialStyleId = Array.isArray(styleIdParam) ? styleIdParam[0] : styleIdParam
  const page = productPages[productId]

  if (!page) {
    notFound()
  }

  if (productId === productRouteSlugs.styles) {
    return <StylesPage initialStyleId={initialStyleId || null} />
  }

  if (productId === productRouteSlugs.variants) {
    return <VariantsPage initialStyleId={initialStyleId || null} />
  }

  return (
    <ModulePlaceholder
      eyebrow="Productos"
      title={page.title}
      description={page.description}
      bullets={page.bullets}
    />
  )
}
