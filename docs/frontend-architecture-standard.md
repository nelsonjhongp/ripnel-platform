# Frontend Architecture Standard

## Objetivo

Mantener claras las fronteras entre rutas de Next.js, pantallas de dominio, componentes compartidos y lógica reutilizable sin imponer una estructura idéntica a todos los módulos.

## Regla base

- `app/` contiene rutas reales, layouts, loading/error boundaries, redirects y wrappers finos.
- `components/modules/<dominio>/` contiene pantallas, formularios, diálogos y piezas cercanas al dominio.
- `components/ui/` contiene primitivas y patrones compartidos.
- `components/feedback/` contiene estados de loading, error, forbidden y empty cuando sean transversales.
- `lib/` contiene rutas, contratos, llamadas API y helpers reutilizables sin renderizado React.

Una ruta `page.tsx` debe ser fina cuando la pantalla tiene lógica o UI de dominio. Una excepción es válida si la página es realmente pequeña o actúa como dispatcher/redirect.

## Archivos y extracción

- `.tsx`: JSX.
- `.ts`: lógica, tipos, cálculos, formatters o contratos sin UI.
- Crear `*-types.ts`, `*-utils.ts`, `*-constants.ts`, `*-messages.ts` o `*-shared.ts` solo cuando hay más de un consumidor, una regla de dominio clara o complejidad que justifique separarlo.
- No crear archivos por simetría ni reexportar estilos globales desde cada módulo.
- Mantener composiciones específicas dentro del módulo hasta que exista reutilización real.

## Rutas

- Usar `apps/frontend/lib/routes.ts` para rutas centrales, builders o slugs repetidos.
- Las URLs visibles de módulos operativos se mantienen en español cuando corresponda.
- Rutas legacy se resuelven con redirects o compatibilidad existente; no son ejemplos para rutas nuevas.
- Las rutas dinámicas y dispatchers deben conservar contratos claros en `routes.ts` o metadata de dominio, no strings repetidos.

Rutas canónicas frecuentes:

- `/inicio`, `/panel`, `/cuenta`, `/cuenta/seguridad`;
- `/ventas/nueva`, `/ventas/historial`, `/ventas/[saleId]`;
- `/inventario`, `/inventario/ajustes`, `/inventario/movimientos`, `/kardex`;
- `/administracion/usuarios`, `/administracion/roles`, `/administracion/ubicaciones`.

Consultar el árbol de `apps/frontend/app` antes de documentar una ruta como actual.

## Cómo agregar una página

1. Confirmar que la URL representa una necesidad real del flujo.
2. Crear `app/(protected)/<ruta>/page.tsx` o la ruta pública correspondiente.
3. Crear una pantalla en `components/modules/<dominio>/` cuando la vista tenga lógica, composición o estado propio.
4. Registrar rutas reutilizables en `routes.ts` cuando corresponda.
5. Extraer helpers solo si serán compartidos o reducen una complejidad demostrable.
6. Verificar permisos, navegación, loading/error y responsive del flujo.

## Checklist breve

- ¿La ruta es necesaria y canónica?
- ¿La página queda fina cuando hay una pantalla de dominio?
- ¿JSX usa `.tsx`?
- ¿La lógica compartida se extrae por necesidad real?
- ¿Las rutas repetidas usan `routes.ts`?
- ¿La pantalla respeta permisos, sede y contratos backend cuando aplica?
- ¿La composición visual sigue el estándar de página sin copiar una pantalla existente de forma literal?
