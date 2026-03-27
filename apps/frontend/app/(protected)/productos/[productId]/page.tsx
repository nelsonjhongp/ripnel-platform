import { notFound } from "next/navigation"
import { ModulePlaceholder } from "@/components/modules/module-placeholder"
import { StylesPage } from "@/components/modules/styles-page"
import { VariantsPage } from "@/components/modules/variants-page"

const productPages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  estilos: {
    title: "Estilos de producto",
    description: "Modulo para registrar el style base y su definicion comercial antes de configurar variantes.",
    bullets: [
      "Crear estilos con nombre, codigo y atributos maestros.",
      "Mantener tela, target y detalle comercial del producto.",
      "Visualizar estado activo y vigencia del style.",
      "Servira como nodo principal para variantes y precios.",
    ],
  },
  variantes: {
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
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const page = productPages[productId]

  if (!page) {
    notFound()
  }

  if (productId === "estilos") {
    return <StylesPage />
  }

  if (productId === "variantes") {
    return <VariantsPage />
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
