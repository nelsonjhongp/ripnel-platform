import { notFound } from "next/navigation"
import { ModulePlaceholder } from "@/components/modules/module-placeholder"

const catalogPages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  tallas: {
    title: "Catalogo de tallas",
    description: "Pantalla base para administrar tallas y su orden operativo dentro del ERP.",
    bullets: [
      "Definir codigo y nombre corto de la talla.",
      "Controlar orden de visualizacion para ventas y estilos.",
      "Activar o desactivar tallas sin borrarlas.",
      "Preparada para conectarse a catalogos maestros del backend.",
    ],
  },
  colores: {
    title: "Catalogo de colores",
    description: "Vista reservada para mantener colores comerciales y variantes visuales del producto.",
    bullets: [
      "Registrar codigo interno y nombre del color.",
      "Asociar color hexadecimal para UI y etiquetas.",
      "Activar o archivar colores segun coleccion.",
      "Base util para estilos, variantes e inventario.",
    ],
  },
  "tipo-prenda": {
    title: "Catalogo de tipo de prenda",
    description: "Modulo pensado para clasificar polos, casacas, jeans y otras familias de producto.",
    bullets: [
      "Definir familias y subfamilias base para producto.",
      "Relacionar tipo de prenda con estilos y reportes.",
      "Mantener nomenclatura limpia para operaciones.",
      "Preparado para integrarse con precios y variantes.",
    ],
  },
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ catalogId: string }>
}) {
  const { catalogId } = await params
  const page = catalogPages[catalogId]

  if (!page) {
    notFound()
  }

  return (
    <ModulePlaceholder
      eyebrow="Catalogos"
      title={page.title}
      description={page.description}
      bullets={page.bullets}
    />
  )
}
