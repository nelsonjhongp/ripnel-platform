import { notFound } from "next/navigation"
import { CatalogCrudPage } from "@/components/modules/catalog-crud-page"

const catalogPages: Record<
  string,
  {
    title: string
    description: string
    endpoint: string
    emptyTitle: string
    emptyDescription: string
    fields: {
      key: string
      label: string
      type: "text" | "number" | "textarea" | "color"
      placeholder?: string
      helper?: string
      editableOnUpdate?: boolean
    }[]
    listFields: { key: string; label: string }[]
    idKey: string
  }
> = {
  tallas: {
    title: "Catalogo de tallas",
    description:
      "CRUD real para tallas operativas. Aqui debes registrar `ST` como Estandar y mantener el orden de venta y estilos.",
    endpoint: "/api/sizes",
    emptyTitle: "Aun no hay tallas",
    emptyDescription:
      "Crea primero las tallas base como ST, S, M, L, XL y XXL para desbloquear estilos y precios.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "ST",
        helper: "Opcional. Si lo dejas vacio, el backend genera un codigo corto.",
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
    idKey: "size_id",
    listFields: [
      { key: "sort_order", label: "Orden" },
      { key: "description", label: "Descripcion" },
    ],
  },
  colores: {
    title: "Catalogo de colores",
    description:
      "CRUD real para colores comerciales y tecnicos. Aqui debes incluir el color tecnico `UNICO` para styles sin color definido.",
    endpoint: "/api/colors",
    emptyTitle: "Aun no hay colores",
    emptyDescription:
      "Empieza por colores base y agrega UNICO para no bloquear styles legacy sin color comercial.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "NEG",
        helper: "Opcional. Si lo dejas vacio, el backend genera un codigo corto.",
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
    idKey: "color_id",
    listFields: [{ key: "hex", label: "Hex" }],
  },
  telas: {
    title: "Catalogo de telas",
    description:
      "CRUD real para telas y referencias legacy de la hoja. En esta etapa se prioriza uso operativo antes que una normalizacion perfecta.",
    endpoint: "/api/fabrics",
    emptyTitle: "Aun no hay telas",
    emptyDescription:
      "Crea telas base como French Terry, Full Licra, Suplex y Rip para desbloquear styles.",
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
    idKey: "fabric_id",
    listFields: [],
  },
  "detalle-de-tela": {
    title: "Catalogo de detalle de tela",
    description:
      "CRUD real para detalles o calificadores complementarios de tela. En esta etapa es opcional y sirve para refinar styles sin bloquear la carga legacy.",
    endpoint: "/api/fabric-details",
    emptyTitle: "Aun no hay detalles de tela",
    emptyDescription:
      "Crea detalles solo si ayudan al negocio. No hace falta sobrecargar este catalogo al inicio.",
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
    idKey: "fabric_detail_id",
    listFields: [],
  },
  targets: {
    title: "Catalogo de targets",
    description: "CRUD real para target comercial cuando el style lo necesite.",
    endpoint: "/api/targets",
    emptyTitle: "Aun no hay targets",
    emptyDescription: "Crea targets solo si realmente los necesitan para clasificar styles.",
    fields: [
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Unisex",
        editableOnUpdate: false,
      },
    ],
    idKey: "target_id",
    listFields: [],
  },
  "tipo-prenda": {
    title: "Catalogo de tipo de prenda",
    description:
      "CRUD real para familias base de producto. Aqui conviene mantener el catalogo limpio: Polo, Top, Jogger, Legging, Short y similares.",
    endpoint: "/api/garment-types",
    emptyTitle: "Aun no hay tipos de prenda",
    emptyDescription:
      "Crea primero familias base y deja el detalle comercial para el nombre del style.",
    fields: [
      {
        key: "code",
        label: "Codigo",
        type: "text",
        placeholder: "JOG",
        helper: "Opcional. Si lo dejas vacio, el backend genera un codigo corto.",
        editableOnUpdate: false,
      },
      {
        key: "name",
        label: "Nombre",
        type: "text",
        placeholder: "Jogger",
      },
    ],
    idKey: "garment_type_id",
    listFields: [],
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
    <CatalogCrudPage
      eyebrow="Catalogos"
      title={page.title}
      description={page.description}
      endpoint={page.endpoint}
      emptyTitle={page.emptyTitle}
      emptyDescription={page.emptyDescription}
      fields={page.fields}
      listFields={page.listFields}
      idKey={page.idKey}
    />
  )
}
