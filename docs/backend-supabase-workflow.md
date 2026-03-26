# Workflow Backend y Supabase

## Objetivo

Mantener orden entre esquema, datos y desarrollo de modulos mientras el backend usa Supabase como PostgreSQL administrado.

## Fuente de verdad

Revisar primero estas rutas:

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules`

La base remota en Supabase es el entorno activo, pero la definicion del esquema debe quedar versionada en SQL dentro del repo.

## Diferencia entre migracion, seed y CRUD

### Migracion

Cambio estructural de base de datos:

- nueva tabla;
- nueva columna;
- constraint;
- indice;
- cambio de tipo;
- nuevo `UNIQUE`.

Regla:

- no hacer cambios estructurales solo a mano en Supabase Studio;
- primero crear una nueva migracion SQL;
- luego aplicarla al entorno;
- dejarla versionada en el repo.

### Seed

Insercion de datos base o de prueba:

- tallas;
- colores;
- tipos de prenda;
- roles base;
- datos demo de estilos o ubicaciones.

Regla:

- usar seeds pequenos e idempotentes;
- poblar solo lo necesario para desbloquear modulos;
- evitar cargas masivas antes de cerrar reglas de creacion y codigos.

### CRUD

Operacion normal del sistema sobre tablas ya existentes:

- crear;
- listar;
- editar;
- activar o desactivar.

## Politica de codigos

- El backend genera los codigos por defecto.
- El frontend solo muestra preview o permite override puntual cuando aplique.
- La validacion de formato y unicidad vive en backend.

Criterios base:

- `locations.code`: prefijo por tipo + nombre + sufijo incremental.
- Catalogos con `code`: codigo corto, unico y en mayusculas.
- `product_styles.style_code`: generado por backend y estable.
- `product_variants.sku`: derivado de `style_code` y atributos.
- `users`: en v1 se usa `email` como identificador operativo.

## Orden tecnico recomendado

1. `Ubicaciones`
2. `Catalogos`
3. `Roles`
4. `Usuarios`
5. `Estilos`
6. `Variantes`
7. `Precios`
8. `Inventario`
9. `Transferencias`
10. `Ventas`

## Regla importante del ERP

El frontend no debe hablar directo con Supabase para operaciones del ERP. La app debe consumir el backend, y el backend debe usar SQL explicito sobre PostgreSQL.

## Ver tambien

- [Acceso del equipo a Supabase](./supabase-team-access.md)
- [Flujo de producto](./product-flow.md)
