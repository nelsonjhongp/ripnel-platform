import { notFound } from "next/navigation"
import { ModulePlaceholder } from "@/components/modules/module-placeholder"

const productPages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  estilos: {
    title: "Estilos de producto",
    description: "Espacio para manejar styles, combinaciones base y definicion comercial de cada producto.",
    bullets: [
      "Crear estilos con nombre, codigo y atributos maestros.",
      "Relacionar tallas, colores y reglas comerciales.",
      "Visualizar estado activo y vigencia del style.",
      "Servira como nodo principal de precios y variantes.",
    ],
  },
  variantes: {
    title: "Variantes de producto",
    description: "Vista pensada para controlar SKU finales por talla, color y otras combinaciones.",
    bullets: [
      "Generar SKU y barcode desde el style base.",
      "Consultar stock por variante y ubicacion.",
      "Preparar inventario, ventas y transferencias.",
      "Lista para integrarse con el backend transaccional.",
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

  return (
    <ModulePlaceholder
      eyebrow="Productos"
      title={page.title}
      description={page.description}
      bullets={page.bullets}
    />
  )
}
