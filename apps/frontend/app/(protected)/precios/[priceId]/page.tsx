import { notFound } from "next/navigation"
import { ListPrices } from "@/components/modules/list-prices"

const pricePages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  "listado-de-precios": {
    title: "Listado de precios",
    description: "Pantalla base para revisar vigencias y precios por style y talla, alineada con el flujo que planteaste.",
    bullets: [
      "Buscar por style, nombre o codigo interno.",
      "Ver vigencia, estado y detalle por talla.",
      "Preparar enlaces a crear y editar precio.",
      "Conectable despues al backend de precios y reglas.",
    ],
  },
  "crear-y-editar-precio": {
    title: "Crear y editar precio",
    description: "Modulo pensado para mantenimiento puntual de precios retail y mayorista por style y talla.",
    bullets: [
      "Definir fechas de vigencia y prioridad.",
      "Editar precio por talla sin romper historial.",
      "Validar estado programado, vigente o vencido.",
      "Base para formularios conectados a SQL explicito.",
    ],
  },
  "regla-mayorista": {
    title: "Regla mayorista",
    description: "Vista reservada para configurar minimos y reglas comerciales mayoristas de manera centralizada.",
    bullets: [
      "Definir umbral minimo de compra por style.",
      "Configurar condiciones comerciales por vigencia.",
      "Mantener reglas auditables desde backend.",
      "Luego se puede integrar con checkout y ventas.",
    ],
  },
}

export default async function PricePage({
  params,
}: {
  params: Promise<{ priceId: string }>
}) {
  const { priceId } = await params

  if (!pricePages[priceId]) {
    notFound()
  }

  if (priceId === "listado-de-precios") {
    return <ListPrices mode="list" />
  }

  if (priceId === "crear-y-editar-precio") {
    return <ListPrices mode="editor" />
  }

  if (priceId === "regla-mayorista") {
    return <ListPrices mode="rules" />
  }

  return null
}
