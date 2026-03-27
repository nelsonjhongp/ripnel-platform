# Flujo de producto

## Objetivo

Definir el flujo estable del modulo de producto para mantener coherencia entre backend, frontend y base de datos.

## Flujo principal

`Catalogos -> Estilos -> Variantes -> Precios`

## Catalogos

Catalogos base que desbloquean producto:

- `sizes`
- `colors`
- `garment_types`
- `fabrics`
- `fabric_details`
- `targets`

Reglas:

- los catalogos se consumen desde backend;
- los registros inactivos no deben ofrecerse por defecto en formularios nuevos;
- `code` se considera identitario y no debe editarse en esta etapa.

## Styles

`Styles` representa el producto base.

Debe manejar:

- `product_styles`
- `style_code`
- nombre comercial
- tipo de prenda
- tela
- detalle de tela opcional
- target opcional
- descripcion
- estado activo

No debe manejar:

- SKU
- barcode
- variantes operativas finales

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

## Edicion segura

La politica actual favorece:

- editar campos descriptivos;
- activar o desactivar antes que borrar;
- bloquear campos identitarios cuando afectan demasiadas relaciones.

Ejemplos:

- en `Styles` no se edita `style_code`, `garment_type_id`, `fabric_id` ni `fabric_detail_id`;
- en `Variants` no se edita `size_id`, `color_id`, `sku` ni `barcode`;
- en `Catalogos` no se edita `code`.
