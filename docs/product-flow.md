# Flujo de producto

## Objetivo

Definir el flujo estable del modulo de producto para mantener coherencia entre backend, frontend y base de datos.

Para la estrategia de normalizacion por etapas, ver
`docs/product-normalization-roadmap.md`.

## Decision actual

El modulo de producto se normaliza primero como producto comercial-operativo.
La ficha tecnica textil queda fuera del alcance inmediato porque pertenece a
una futura capa de taller o produccion.

Producto, en esta etapa, debe responder:

- que se vende;
- en que tallas y colores;
- con que SKU;
- a que precio;
- donde hay stock.

No debe resolver todavia:

- composicion de tela;
- consumo/rendimiento;
- detalles de confeccion;
- estructura de insumos o BOM;
- instrucciones de taller.

## Flujo principal

`Catalogos comerciales -> Estilos -> Variantes -> Precios -> Stock`

## Alta completa de producto

El alta estandar del MVP crea un producto comercial completo desde el modal
`Nuevo producto`:

```text
Crear style
-> configurar tallas y colores
-> generar variantes
-> continuar con precios / stock
```

Campos visibles del alta:

- nombre comercial;
- tipo de prenda (`garment_type_id`);
- descripcion opcional;
- tallas seleccionadas desde `sizes`;
- colores seleccionados desde `colors`.

Reglas:

- el usuario trabaja con lenguaje comercial: producto, tallas, colores y
  variantes;
- el backend sigue usando `style_id` como identificador tecnico del producto
  base;
- `Sin color especifico` no aparece como color manual: el frontend envia
  `color_ids: []` y el backend resuelve el color tecnico `UNICO`;
- si el usuario elige colores reales, `UNICO` no participa en el dropdown;
- `fabrics`, `fabric_details` y `targets` no se piden ni se infieren en esta
  alta.

Validacion del nombre comercial:

- se compara de forma normalizada para evitar duplicados como `Cafarena Rip`
  vs `Cafarena - Rip`;
- la normalizacion de comparacion ignora acentos, guiones, puntuacion,
  mayusculas/minusculas y espacios repetidos;
- el texto visible que escribio el usuario no se transforma agresivamente:
  solo se aplica `trim` y colapso de espacios al salir del campo;
- el frontend valida en vivo para evitar trabajo perdido y el backend valida
  de nuevo antes de crear o editar.

Compatibilidad:

- `/productos/nuevo` es ruta legacy mientras exista;
- la ruta legacy debe usar la misma regla de duplicado por nombre comercial que
  el modal principal;
- no debe reintroducir campos textiles ni generacion manual de SKU/barcode.

## Catalogos

Catalogos base que desbloquean producto comercial:

- `sizes`
- `colors`
- `garment_types`

Reglas:

- los catalogos se consumen desde backend;
- los registros inactivos no deben ofrecerse por defecto en formularios nuevos;
- `code` se considera identitario y no debe editarse en esta etapa.

Catalogos que quedan fuera del alta principal:

- `fabrics`
- `fabric_details`
- `targets`

Estos catalogos pueden conservarse en la base de datos mientras se define la
capa futura de taller/produccion o clasificacion comercial, pero no deben
bloquear la creacion de un producto vendible.

## Styles

`Styles` representa el producto base.

Debe manejar:

- `product_styles`
- `style_code`
- nombre comercial
- tipo de prenda
- descripcion
- estado activo

No debe manejar:

- SKU
- barcode
- variantes operativas finales
- ficha tecnica textil
- clasificacion comercial avanzada

Campos del nucleo actual:

- `name`
- `garment_type_id`
- `style_code`
- `description`
- `active`

Campos a desacoplar del flujo principal:

- `fabric_id`
- `fabric_detail_id`
- `target_id`

Estos campos pueden permanecer temporalmente como columnas `nullable` en
`product_styles`, pero la interfaz principal de creacion no debe exigirlos ni
usarlos para construir el nombre del producto.

## Variants

`Variants` representa las combinaciones operativas del style.

Debe manejar:

- `style_sizes`
- `style_colors`
- `product_variants`

Flujo:

1. elegir un style existente;
2. configurar tallas permitidas;
3. configurar colores permitidos;
4. guardar configuracion;
5. generar variantes faltantes en lote.

## SKU y barcode

- `SKU` si entra en la etapa actual.
- `SKU` se genera en backend a partir de `style_code` y atributos.
- `Barcode` queda opcional o `null` en esta iteracion.
- impresion de etiquetas y estandar de barcode quedan para una etapa posterior.
- `style_code`, `SKU` y `barcode` son datos tecnicos; el modal de alta
  comercial no debe pedirlos ni usarlos como validacion manual.

## Edicion segura

La politica actual favorece:

- editar campos descriptivos;
- activar o desactivar antes que borrar;
- bloquear campos identitarios cuando afectan demasiadas relaciones.

Ejemplos:

- en `Styles` no se edita `style_code` ni `garment_type_id`;
- en `Variants` no se edita `size_id`, `color_id`, `sku` ni `barcode`;
- en `Catalogos` no se edita `code`.

La ficha tecnica futura debe poder completarse despues, por lo que `fabric_id`,
`fabric_detail_id` y datos similares no deben tratarse como identidad comercial
permanente del style.

## Normalizacion por etapas

### Etapa 1: producto comercial MVP

Objetivo: simplificar el alta y dejar estable el flujo vendible.

- Mantener `garment_types` relacionado directamente a `product_styles`.
- Crear producto con nombre, tipo de prenda y descripcion opcional.
- Configurar tallas y colores en el alta completa o desde Variantes.
- Generar variantes desde backend.
- Asignar precios por talla.
- Cargar stock desde inventario.
- Ocultar `fabric_id`, `fabric_detail_id` y `target_id` del alta principal.

### Etapa 2: ficha tecnica o produccion

Objetivo: mover datos textiles a una capa propia cuando el modulo exista.

Modelo candidato:

```text
product_production_profile
- style_id
- fabric_id
- fabric_detail_id
- composition
- weight
- yield
- workshop_notes
```

Esta etapa puede reutilizar `fabrics` y `fabric_details`, pero su relacion
principal seria con la ficha tecnica, no con el alta comercial.

### Etapa 3: clasificacion comercial

Objetivo: definir si `targets` sigue como catalogo simple o pasa a etiquetas,
colecciones u otra estructura flexible.

Hasta tomar esa decision, `target_id` no debe ser requisito para crear, vender,
transferir o cargar inventario.

## Criterio para quitar tablas

No se eliminan tablas solo porque ya no aparezcan en el alta de producto.

Antes de quitar una tabla debe confirmarse:

- que no representa un dato necesario para produccion, compras o reportes;
- que no hay datos historicos relevantes que conservar;
- que no existe una migracion futura razonable donde pueda reutilizarse;
- que los endpoints y pantallas consumidoras ya no dependen de ella.

Decision actual:

- `garment_types`: se mantiene en producto.
- `sizes`: se mantiene para variantes.
- `colors`: se mantiene para variantes.
- `fabrics`: se conserva para futura ficha tecnica.
- `fabric_details`: se conserva temporalmente, pendiente de validar si debe
  seguir como catalogo o convertirse en atributos tecnicos.
- `targets`: se conserva temporalmente, pendiente de validar como clasificacion
  comercial.
