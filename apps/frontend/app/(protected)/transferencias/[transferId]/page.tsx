import { notFound } from "next/navigation"
import { ModulePlaceholder } from "@/components/modules/module-placeholder"

const transferPages: Record<
  string,
  { title: string; description: string; bullets: string[] }
> = {
  "listado-de-transferencias": {
    title: "Listado de transferencias",
    description: "Vista base para revisar transferencias entre sedes con sus estados operativos.",
    bullets: [
      "Filtrar por origen, destino y estado.",
      "Consultar fecha, responsable y documentos asociados.",
      "Abrir detalle completo de una transferencia.",
      "Preparada para integrarse al flujo transaccional de stock.",
    ],
  },
  "crear-transferencia": {
    title: "Crear transferencia",
    description: "Pantalla inicial para armar solicitudes de traslado entre almacenes y tiendas.",
    bullets: [
      "Seleccionar origen, destino y productos.",
      "Validar stock antes de confirmar salida.",
      "Registrar lineas y cantidades por variante.",
      "Luego conectable con movimientos y recepcion.",
    ],
  },
  "recepciones-pendientes": {
    title: "Recepciones pendientes",
    description: "Modulo pensado para confirmar ingresos pendientes desde otras sedes.",
    bullets: [
      "Revisar transferencias enviadas no recepcionadas.",
      "Confirmar cantidades reales recibidas.",
      "Generar diferencias o incidencias de stock.",
      "Base para auditoria operativa por ubicacion.",
    ],
  },
}

export default async function TransferPage({
  params,
}: {
  params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params
  const page = transferPages[transferId]

  if (!page) {
    notFound()
  }

  return (
    <ModulePlaceholder
      eyebrow="Transferencias"
      title={page.title}
      description={page.description}
      bullets={page.bullets}
    />
  )
}
