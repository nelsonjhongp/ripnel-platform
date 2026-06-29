# Roadmap de normalizacion de producto

## Objetivo

Definir hacia donde debe evolucionar el modulo de productos de RIPNEL antes de
seguir acumulando reglas sobre una tabla demasiado amplia.

La decision base es separar el producto comercial-operativo del producto tecnico
de produccion. El MVP actual necesita vender, transferir, poner precio y mover
stock. La produccion textil necesitara luego tela, consumo, insumos, ficha
tecnica y taller, pero esa capa no debe condicionar el alta comercial.

## Principio central

`product_styles` debe representar lo que la tienda reconoce como producto base.

Debe responder:

- que vendemos;
- como se llama comercialmente;
- que tipo de prenda es;
- que variantes vendibles tiene;
- que precio y stock tiene.

No debe responder todavia:

- de que tela exacta se fabrica;
- que composicion o gramaje tiene;
- cuanto insumo consume;
- que taller lo produce;
- que pasos de confeccion requiere;
- que atributos tecnicos necesita produccion.

Esta separacion evita que ventas dependa de decisiones tecnicas que todavia no
forman parte del sistema.

## Modelo objetivo

### Producto comercial

Este es el nucleo que usa ventas, inventario, transferencias y precios.

```text
product_styles
- style_id
- garment_type_id
- style_code
- name
- description
- active
- created_at
- updated_at

style_sizes
- style_id
- size_id

style_colors
- style_id
- color_id

product_variants
- variant_id
- style_id
- size_id
- color_id
- sku
- barcode
- active
- created_at
- updated_at

style_size_prices
- style_id
- size_id
- price_type
- price
- start_date
- end_date
- active
```

### Producto tecnico o produccion

Esta capa debe existir cuando RIPNEL modele taller, produccion, compras o ficha
tecnica. No tiene que estar completa en el MVP comercial.

Modelo candidato:

```text
product_technical_profiles
- technical_profile_id
- style_id
- fabric_id
- fabric_detail_id
- composition
- weight_gsm
- yield_notes
- workshop_notes
- active
- created_at
- updated_at
```

La relacion principal es `style_id`, porque una ficha tecnica describe como se
produce un producto comercial existente.

### Clasificacion comercial

`target_id` no pertenece claramente al nucleo del producto. Puede evolucionar a
una de estas formas:

```text
product_commercial_profiles
- style_id
- target_id
- collection_id
- season
- notes
```

o:

```text
product_tags
- tag_id
- name
- active

product_style_tags
- style_id
- tag_id
```

La segunda opcion es mas flexible si un producto puede ser "mujer", "urbano",
"deportivo", "verano" o "basico" al mismo tiempo.

## Decision sobre placeholders

Hay tres caminos posibles para la capa tecnica.

### Opcion A: no crear placeholder ahora

Se eliminan `fabric_id`, `fabric_detail_id` y `target_id` de `product_styles`.
Las tablas `fabrics`, `fabric_details` y `targets` pueden quedarse como catalogos
sin uso directo hasta que exista produccion o clasificacion comercial.

Ventaja:

- deja el producto comercial muy limpio;
- evita crear tablas prematuras;
- obliga a disenar produccion cuando realmente toque.

Costo:

- si ya hay datos tecnicos cargados, hay que decidir si se pierden, se archivan
  o se migran despues;
- durante un tiempo `fabrics` y `fabric_details` pueden existir sin consumidor
  principal.

### Opcion B: crear placeholder tecnico minimo

Se crea `product_technical_profiles` con pocos campos y se migran ahi
`fabric_id` y `fabric_detail_id`.

Ventaja:

- conserva datos existentes;
- deja claro que tela pertenece a ficha tecnica, no al producto comercial;
- prepara una ruta natural hacia produccion.

Costo:

- introduce una tabla que todavia no tiene UI completa;
- puede tentar a seguir agregando campos tecnicos sin haber definido produccion.

### Opcion C: mantener columnas temporalmente

Se dejan `fabric_id`, `fabric_detail_id` y `target_id` en `product_styles`, pero
se ocultan del alta principal.

Ventaja:

- menor esfuerzo inmediato;
- menor impacto en queries actuales.

Costo:

- mantiene ambiguedad de dominio;
- el equipo puede seguir tratandolos como parte del producto base;
- posterga la normalizacion real.

## Recomendacion

Como RIPNEL aun no esta en produccion, conviene elegir la Opcion B si ya existen
datos utiles que conservar, o la Opcion A si los datos actuales son semilla o
faciles de reconstruir.

La opcion C solo deberia usarse si queremos una iteracion muy corta. Para un
sistema mas robusto, no es la mejor direccion.

Recomendacion practica:

- crear `product_technical_profiles` minimo;
- mover `fabric_id` y `fabric_detail_id` ahi;
- sacar `target_id` del nucleo y dejar su nuevo modelo para una iteracion
  comercial posterior;
- limpiar backend y frontend para que producto comercial no dependa de esos
  campos.

## Meta final del modulo

Al terminar esta normalizacion, RIPNEL deberia tener:

- un alta de producto simple y rapida;
- una tabla `product_styles` sin datos de produccion;
- variantes generadas desde tallas y colores;
- precios desacoplados por talla y tipo de precio;
- inventario y transferencias usando solo variantes vendibles;
- una ruta clara para agregar ficha tecnica sin tocar ventas;
- una ruta clara para agregar clasificacion comercial flexible.

El flujo deseado:

```text
Crear producto comercial
-> configurar tallas y colores
-> generar variantes
-> asignar precios
-> cargar stock
-> vender / transferir

Luego, cuando aplique:
-> completar ficha tecnica
-> definir insumos / produccion
-> conectar con taller
```

## Iteraciones propuestas

### Iteracion 1: separar producto comercial

Objetivo: dejar limpio el nucleo sin construir todo produccion.

- Crear migracion de normalizacion.
- Quitar `fabric_id`, `fabric_detail_id` y `target_id` de `product_styles`.
- Crear `product_technical_profiles` minimo o documentar que no se crea aun.
- Ajustar `styles.repo.js` y `styles.service.js`.
- Ajustar `products.repo.js` y `variants.repo.js`.
- Simplificar `/productos/nuevo`.
- Quitar tela, detalle y target de pantallas comerciales de producto.

Criterio de aceptacion:

- se puede crear un producto con nombre y tipo de prenda;
- el producto aparece como `draft`;
- se pueden configurar tallas y colores;
- se pueden generar variantes;
- se pueden asignar precios;
- ventas/inventario/transferencias no necesitan tela ni target.

### Iteracion 2: workspace de producto

Objetivo: que producto tenga una pantalla operativa unica.

- Crear o consolidar una vista por `style_id`.
- Mostrar estado operativo: borrador, faltan variantes, faltan precios, sin stock
  o listo.
- Dar acciones directas para variantes, precios e inventario.
- Evitar que el usuario navegue por modulos internos para completar un producto.

Criterio de aceptacion:

- desde un producto nuevo se ve cual es el siguiente paso;
- el operador puede completar el producto sin entender las tablas internas;
- la pantalla no muestra ficha tecnica si produccion aun no existe.

### Iteracion 3: clasificacion comercial

Objetivo: resolver el reemplazo de `target_id`.

- Decidir entre `product_commercial_profiles` o tags.
- Si se eligen tags, crear `product_tags` y `product_style_tags`.
- Usar clasificacion solo para filtros, reportes y catalogo, no para ventas base.

Criterio de aceptacion:

- un producto puede venderse aunque no tenga clasificacion;
- la clasificacion no bloquea variantes, precios ni stock;
- los filtros comerciales no requieren cambios en ventas.

### Iteracion 4: ficha tecnica / produccion

Objetivo: activar la capa tecnica cuando exista necesidad real de taller.

- Expandir `product_technical_profiles`.
- Definir atributos tecnicos necesarios.
- Definir BOM o estructura de insumos si aplica.
- Conectar con compras, produccion o taller.

Criterio de aceptacion:

- la ficha tecnica puede completarse despues del alta comercial;
- produccion puede leer datos tecnicos sin modificar ventas;
- los datos tecnicos tienen dueños y reglas propias.

## Preguntas abiertas

- Hay datos actuales de `fabric_id`, `fabric_detail_id` o `target_id` que deban
  conservarse?
- `fabric_details` representa un catalogo estable o deberia transformarse en
  atributos tecnicos mas concretos?
- `target` es una sola clasificacion o deberia ser multiple mediante tags?
- El codigo `style_code` debe seguir usando tela en su generacion o pasar a
  depender solo de tipo de prenda y nombre?
- El producto puede cambiar de tipo de prenda despues de creado o eso sigue
  siendo identidad bloqueada?

## Riesgos a cuidar

- Romper busquedas que hoy esperan `fabric_name` o `target_name`.
- Mantener una tabla tecnica placeholder sin uso y empezar a llenarla sin reglas.
- Confundir `active` con estado de completitud.
- Cambiar `style_code` de forma que afecte SKU, historicos o busquedas.
- Crear clasificacion comercial demasiado rigida antes de entender como la usa
  RIPNEL.

## Decision pendiente inmediata

Antes de implementar, elegir una de estas dos rutas:

- Ruta A: eliminar campos tecnicos de `product_styles` y no crear placeholder.
- Ruta B: eliminar campos tecnicos de `product_styles` y crear
  `product_technical_profiles` minimo.

Para RIPNEL, la ruta recomendada es B si queremos conservar el aprendizaje de
tela/detalle sin meter produccion completa todavia.
