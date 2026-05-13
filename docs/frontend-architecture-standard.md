# Frontend Architecture Standard

Guia breve para mantener ordenada la arquitectura frontend de RIPNEL sin forzar una reescritura completa.

Este documento complementa `docs/frontend-page-standard.md`, `docs/frontend-ui-ux-operativo.md` y `docs/frontend-operational-components.md`. Si hay duda visual, manda el estandar de pagina; si hay duda de ubicacion de archivos, manda este documento.

## Objetivo

- Mantener clara la frontera entre rutas reales de Next y pantallas operativas.
- Evitar que `app/(protected)` vuelva a crecer como carpeta de pantallas mezcladas.
- Usar TypeScript de forma progresiva y consistente.
- Documentar excepciones actuales para no tratarlas como patrones nuevos.

## Regla Base

`app/(protected)` representa URLs reales de Next.js. Debe contener:

- `layout.tsx`, `loading.tsx`, `error.tsx` y rutas especiales de App Router.
- `page.tsx` finos que importan una pantalla desde `components/modules/<domain>`.
- redirects legacy o rutas de compatibilidad.
- dispatchers de rutas dinamicas cuando el segmento mezcla slugs internos e ids reales.

`components/modules/<domain>` contiene pantallas operativas de dominio. Cada dominio agrupa sus paginas, formularios y piezas compartidas cercanas.

`lib` contiene contratos, rutas, helpers o llamadas API reutilizables que no dependen de renderizado React.

## Extensiones

- Usar `.tsx` para todo archivo que renderiza JSX.
- Usar `.ts` para tipos, helpers, constantes, formatters, calculos y logica sin UI.
- No crear `.ts` por simetria. Crear `*-shared.ts`, `*-types.ts` o `*-utils.ts` solo cuando mas de una pantalla del dominio comparte esa logica.
- No agregar nuevos `.jsx`. Los `.jsx` actuales son deuda temporal documentada.

Estado actual:

- `inventory` tiene `inventory-adjustments-shared.ts` porque comparte tipos/helpers entre listado y creacion de ajustes.
- `transfers` tiene `transfers-shared.ts` porque varias pantallas comparten estado, fechas y clases de estado.
- `catalogs` y `customers` pueden vivir solo con `.tsx` mientras sus helpers esten pegados al formulario o a una sola pantalla.

## Rutas y URLs

Las rutas operativas canonicas usan espanol cuando el modulo es visible para usuarios. Las URLs antiguas se conservan como compatibilidad en `next.config.ts` y dentro de `app/(protected)/(legacy)`.

- Usar `apps/frontend/lib/routes.ts` para rutas centrales, slugs especiales y builders.
- Usar `next.config.ts` para redirects legacy que deben ocurrir antes del shell protegido.
- Labels visibles pueden estar en espanol aunque el nombre interno sea ingles.
- Nombres internos de archivos, carpetas, tipos y helpers deben preferir ingles.
- No crear nuevas rutas canonicas en ingles para modulos operativos del ERP.
- Excepciones actuales razonables: `/bi` por acronimo de negocio y `/kardex` por termino operativo.

Rutas canonicas normalizadas:

- `/cuenta` y `/cuenta/seguridad`.
- `/panel`.
- `/inventario` y `/inventario/ajustes`.
- `/ventas`, `/ventas/historial` y `/ventas/[saleId]`.

Rutas legacy actuales:

- `/account`, `/account-mockup`, `/account/seguridad`, `/account/apariencia` y `/account/operacion` redirigen a `/cuenta`.
- `/dashboard` redirige a `/panel`.
- `/inventory`, `/inventory/ajustes` y `/inventory/ajustes/nuevo` redirigen a `/inventario`.
- `/purchase-system`, `/purchase-system/[saleId]`, `/purchase-system/checkout` y `/purchase-system/checkout-payment` redirigen a `/ventas`.
- `/transaction-history` redirige a `/ventas/historial`.
- `/administracion/roles&usuarios` redirige a `/administracion/usuarios`.
- `/clientes/dashboards` redirige a `/bi?view=clientes`.
- `/precios/listado-de-precios` redirige a `/precios`.
- `/precios/crear-y-editar-precio` redirige a `/precios/crear` preservando `style_id`.

## Rutas Dinamicas

No partir ni renombrar estas rutas sin una fase especifica:

- `transferencias/[transferId]` mezcla slugs de modulo con ids reales de transferencia.
- `productos/[productId]` funciona como dispatcher de submodulos (`estilos`, `variantes`), no como detalle real de producto.
- `catalogos/[catalogId]` usa slugs de catalogo desde `product-master-metadata`.

Los slugs especiales deben vivir en `routes.ts` o metadata de dominio, no repetidos como strings sueltos.

## Auditoria Actual de `app/(protected)`

Estas pantallas grandes ya viven como modulos de dominio y sus rutas en `app/(protected)` deben mantenerse como wrappers finos:

- ventas y POS en `components/modules/sales`.
- postventa en `components/modules/postsales`.
- caja en `components/modules/cash`.
- administracion en `components/modules/administration`.
- dashboard, inicio, BI, inventario principal, kardex y account en sus carpetas de dominio.

Pantallas ya alineadas con wrappers finos desde fases previas:

- `catalogos`, `clientes`, `precios`, `productos`, `inventario/ajustes` y `transferencias` en sus rutas module-driven.
- `account`, `dashboard`, `inventory`, `purchase-system` y `transaction-history` quedan solo como rutas legacy dentro de `(legacy)`.

## JSX Temporal

Solo debe quedar esta excepcion funcional conocida:

- `apps/frontend/components/modules/sales/pos/pos-page.jsx`: conservar hasta una fase de extraccion POS.

`PaymentMethods` queda convertido a TSX en `components/modules/sales/legacy`; sigue siendo candidato a eliminacion si no se recupera para un flujo activo.

No usar estas excepciones como referencia para nuevas paginas.

## Como Agregar Una Pagina Nueva

- Crear la URL en `app/(protected)/<ruta>/page.tsx`.
- Si la pantalla tendra logica o UI propia, crear el componente en `components/modules/<domain>/<name>-page.tsx` y dejar la ruta como wrapper fino.
- Si la ruta solo reemplaza una URL antigua, implementar redirect y agregarla a `legacyAppRoutes`.
- Si necesita links compartidos, agregar constantes o builders en `routes.ts`.
- Si aparecen helpers compartidos por mas de una pantalla, extraerlos a `.ts` dentro del dominio o a `lib` si son transversales.

## Checklist

- La ruta nueva tiene una URL real y necesaria?
- El `page.tsx` es fino o existe una razon concreta para que sea una pantalla completa?
- El archivo con JSX usa `.tsx`?
- La logica sin UI vive en `.ts` solo si realmente se comparte?
- Los links usan `routes.ts` cuando son rutas centrales o repetidas?
- No se agrego un nuevo `.jsx`?
- La pantalla respeta `docs/frontend-page-standard.md` y los tokens operativos?
