# Módulos comerciales — Documentación de dominio

Agrupa los módulos de operación comercial: clientes, precios, catálogos y ubicaciones. Son módulos de patrón CRUD con reglas de validación acotadas.

---

## Customers — `/api/customers`

### Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/customers` | `customers.manage` o `sales.pos` | Listado con búsqueda, filtro por tipo de documento, paginación |
| `POST` | `/api/customers` | `customers.manage` o `sales.pos` | Crear cliente |
| `PATCH` | `/api/customers/:customerId` | `customers.manage` o `sales.pos` | Editar cliente |
| `DELETE` | `/api/customers/:customerId` | `customers.manage` | Soft-delete (active = false) |

### Tipos de documento

| Tipo | Formato | Uso |
|---|---|---|
| `none` | Sin documento | Cliente mostrador, ventas sin identificación fiscal |
| `dni` | 8 dígitos | Persona natural (boleta) |
| `ruc` | 11 dígitos | Empresa (factura) |
| `ce` | 9-12 alfanumérico | Carné de extranjería (boleta) |
| `passport` | 6-15 alfanumérico | Pasaporte |

### Tipos de cliente

| Tipo | Significado | Impacto |
|---|---|---|
| `retail` | Minorista | Precio retail en ventas |
| `wholesale` | Mayorista | Precio wholesale si hay regla activa con cantidad mínima |

### Reglas de validación

- `document_type = none` → `document_number` debe ser vacío
- Cualquier otro tipo → `document_number` requerido y con formato válido
- `full_name` requerido para crear
- El backend normaliza el documento (uppercase para passport, trim para todos)
- Soft-delete: `DELETE` solo marca `active = false`

### Cliente mostrador genérico

El cliente con `internal_code = 'SALE-CLI-001'` se usa como fallback en ventas sin cliente seleccionado. Debe existir y estar activo.

---

## Prices — `/api/prices`

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/prices` | Listado de precios con filtros (sede, variante, estilo) y paginación |
| `GET` | `/api/prices/catalog` | Catálogo de precios para consulta rápida |
| `GET` | `/api/prices/coverage-gaps` | Variantes sin precio asignado (brechas de cobertura) |
| `GET` | `/api/prices/workspace/:styleId` | Workspace de precios para un estilo (todas las variantes y sedes) |
| `POST` | `/api/prices` | Crear precio (variant_id + location_id + retail_price + wholesale_price) |
| `PATCH` | `/api/prices/:priceId` | Editar precio |

### Conceptos

- **Precio retail:** precio de venta al público (cliente tipo `retail`)
- **Precio wholesale:** precio mayorista (cliente tipo `wholesale`)
- **Cobertura:** una variante tiene cobertura completa si tiene precio asignado en todas las sedes activas
- **Gaps:** variantes o sedes sin precio → `GET /api/prices/coverage-gaps`

### Estructura

Un registro de precio asocia `(variant_id, location_id)` con `retail_price` y `wholesale_price`.

---

## Pricing Rules — `/api/pricing-rules`

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pricing-rules` | Listar reglas de precio mayorista |
| `POST` | `/api/pricing-rules` | Crear regla |
| `PATCH` | `/api/pricing-rules/:ruleId` | Editar regla |

### Concepto

La regla mayorista define una **cantidad mínima** de unidades para que un cliente `wholesale` obtenga precio wholesale. Si no hay regla activa o no se alcanza la cantidad mínima, aplica precio retail incluso para clientes wholesale.

---

## Catalogs — `/api` (directo)

### Endpoints

El módulo es genérico: el mismo controller sirve a múltiples catálogos definidos en `catalogs.config.js`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/sizes` | Listar tallas |
| `POST` | `/api/sizes` | Crear talla |
| `PATCH` | `/api/sizes/:id` | Editar talla |
| `GET` | `/api/colors` | Listar colores |
| `POST` | `/api/colors` | Crear color |
| `PATCH` | `/api/colors/:id` | Editar color |
| `GET` | `/api/garment-types` | Listar tipos de prenda |
| `POST` | `/api/garment-types` | Crear tipo de prenda |
| `PATCH` | `/api/garment-types/:id` | Editar tipo de prenda |

### Catálogos definidos

| Catálogo | Tabla | Campos editables | Genera código |
|---|---|---|---|
| `sizes` | `sizes` | name, sort_order, description, active | Sí |
| `colors` | `colors` | name, hex, active | Sí |
| `garment-types` | `garment_types` | name, active | Sí |

### Arquitectura genérica

`catalogs.config.js` define por cada catálogo: tabla, campo ID, campos editables, columnas de respuesta y orden. El controller es genérico: `getCatalogItems('sizes')` resuelve la configuración y ejecuta el CRUD sobre la tabla correspondiente. El código se genera con `catalogs-code.js` usando la misma configuración.

### Reglas

- Código (`code`) no es editable — lo genera el backend
- Campos no listados en `editableFields` no se modifican
- Soft-delete vía `active`; no hay `DELETE` físico

---

## Locations — `/api/locations`

### Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/locations` | Autenticado | Listar ubicaciones activas (público para selects) |
| `POST` | `/api/locations` | `admin.manage` | Crear ubicación |
| `PATCH` | `/api/locations/:locationId` | `admin.manage` | Editar ubicación |

### Reglas

- **Código autogenerado:** `locations-code.js` genera `code` con prefijo por tipo + nombre + sufijo incremental
- **Asignación a usuarios:** los usuarios se asignan a ubicaciones en `user_locations` (tabla de relación). La sede default del usuario determina el contexto operativo en ventas, caja e inventario
- **Sede activa:** solo ubicaciones con `active = true` se ofrecen en selects y son válidas para operaciones
