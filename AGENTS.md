# RIPNEL Project Guide

## Propósito

RIPNEL es un ERP interno para inventario, ventas, precios, caja, postventa y transferencias de una operación textil. El objetivo actual es entregar flujos operativos confiables y claros, no construir una plataforma genérica ni un design system cada vez más grande.

## Estructura y fuentes de verdad

```text
apps/frontend   Next.js App Router, interfaz y experiencia operativa
apps/backend    Express, reglas de negocio, autorización y transacciones
supabase        migraciones y configuración de PostgreSQL administrado
database        snapshots y scripts SQL de referencia
docs            decisiones, flujos y estándares activos
```

Antes de inventar tablas, campos o reglas de dominio, revisar en este orden:

1. `supabase/migrations/`
2. `database/`
3. `apps/backend/src/modules/`
4. el documento de dominio aplicable dentro de `docs/`

La migración y el backend prevalecen sobre ejemplos de frontend o documentación histórica.

## Arquitectura obligatoria

- El frontend llama al backend para toda operación ERP.
- El backend decide autorización, reglas de negocio, stock, precios, caja y transacciones.
- El frontend no consulta tablas de Supabase directamente para flujos ERP.
- El backend usa PostgreSQL con `pg` y SQL explícito; no introducir ORM sin una decisión técnica explícita.
- Mantener CommonJS en backend mientras el repositorio lo use.
- Preferir módulos de dominio pequeños y reconocibles: rutas, controlador, servicio y repositorio cuando la complejidad lo justifique.
- No crear capas, wrappers o servicios sin una responsabilidad concreta.

## Frontend: ubicación de código

- `app/` contiene rutas reales de Next, layouts, `loading`, `error`, redirects y wrappers finos.
- `components/modules/<dominio>/` contiene pantallas y piezas cercanas a un flujo de negocio.
- `components/ui/` contiene primitivas y patrones operativos compartidos.
- `components/feedback/` contiene estados de carga, vacío, error y acceso denegado.
- `lib/` contiene contratos, clientes API, helpers, rutas y lógica reutilizable sin renderizado React.

Usar `.tsx` para JSX y `.ts` para lógica sin UI. No crear `messages`, `constants`, `types`, `utils` o `shared` por simetría: crear el archivo solo cuando hay lógica o datos realmente compartidos.

Para rutas visibles, usar `apps/frontend/lib/routes.ts` cuando exista una constante o builder reutilizable. Las rutas legacy son compatibilidad; no crear nuevas URLs canónicas en inglés para módulos operativos.

## Trabajo visual y componentes

Antes de una tarea visual, leer solo los documentos pertinentes:

- `DESIGN.md` para tokens, controles y jerarquía.
- `docs/frontend-page-standard.md` para composición de página.
- `docs/frontend-ui-ux-operativo.md` para criterios operativos.
- `docs/frontend-operational-components.md` cuando el flujo requiere selección, multiselección, acciones de tabla o formularios.

Principios:

- Referencia de escritorio operativa: **1366×768 a 100% de zoom**.
- No debe haber scroll horizontal de toda la página. Las tablas amplias pueden tener scroll dentro de su contenedor.
- Priorizar densidad, lectura rápida y acciones directas sobre tarjetas decorativas o whitespace excesivo.
- El color violeta se usa para acción primaria, foco, selección y contexto activo; no como fondo dominante.
- Mantener soporte claro y oscuro para todo cambio visual.
- No añadir texto explicativo persistente cuando labels, estructura y acciones ya comunican el flujo. Usar ayuda contextual solo cuando previene un error o aclara una decisión.

### Elección de componentes

Usar el componente existente que corresponda al problema antes de crear uno nuevo. La lista canónica de componentes compartidos está en `docs/frontend-component-inventory.md`.

Esto no obliga a usar componentes compartidos en cada bloque de una vista. El inventario orienta la elección según semántica y necesidad, no impone una plantilla rígida.

### Reutilización y extracción

- Crear un componente compartido solo cuando exista repetición real en al menos **dos usos estables de módulos distintos**, o cuando encapsule una interacción accesible difícil de repetir correctamente.
- Mantener composiciones específicas de dominio cerca de su módulo: POS, productos, caja, postventa y transferencias pueden tener piezas propias.
- Componentes legacy se conservan por compatibilidad. No iniciar una migración masiva solo para eliminarlos.
- No crear wrappers que solo agreguen una clase Tailwind o cambien el nombre de un componente base.
- Las constantes de estilo compartidas deben representar un patrón semántico real y mantenido en `ops-control-styles.ts`; no extraer combinaciones locales de dos clases por obligación.

### Formularios, diálogos y estados

- Preferir `OpsFormField` para campos que necesitan label, requerido, hint o error.
- Usar `OpsSelect` en código nuevo cuando encaje; no migrar controles legacy fuera de una tarea funcional relacionada.
- Usar `OpsDialog` para modales operativos. La descripción debe explicar el propósito o consecuencia del diálogo; no inventar copy redundante solo para llenar una prop.
- La validación local debe ser clara y la validación final pertenece al backend.
- Usar errores por campo cuando el formulario tenga varios campos corregibles. Un error global es válido para fallas de red, permisos o reglas cruzadas sin campo responsable.
- Estados como `validating` o pre-chequeos de duplicados se usan cuando evitan pérdida de trabajo o una llamada costosa; no son obligatorios para todo CRUD.

### Copy, mensajes y estilos

Centralizar:

- errores de backend y validaciones reutilizables;
- toasts y confirmaciones;
- estados de negocio;
- copy dinámico con variables;
- textos compartidos por varias pantallas.

Se permite inline:

- labels locales;
- placeholders locales;
- `aria-label` local;
- botones simples como “Guardar”, “Cancelar”, “Editar”;
- copy que solo existe una vez y no representa una regla de dominio.

No iniciar campañas para mover todos los strings a archivos de mensajes ni para eliminar toda clase inline. La claridad del flujo y la consistencia visible tienen prioridad sobre una métrica de hardening.

## Pruebas y verificación

Cada cambio debe verificar lo proporcional a su riesgo:

- UI o TypeScript: `npm exec --workspace @ripnel/frontend tsc -- --noEmit` y `npm run lint --workspace @ripnel/frontend`.
- Cambio funcional de frontend: además, prueba manual del flujo afectado en datos reales o de prueba.
- Backend: ejecutar pruebas o smoke tests del endpoint afectado; confirmar permisos, validación y transacción.
- Migraciones: revisar SQL, compatibilidad de datos existentes y rollback o plan seguro de corrección.

Para cambios visuales, revisar tema claro y oscuro cuando el componente use tokens o estados semánticos. Para páginas operativas, comprobar 1366×768 y que la acción principal sea visible sin scroll innecesario.

## Documentación y decisiones

- `README.md`: onboarding, arquitectura breve, comandos, módulos y rutas actuales.
- `DESIGN.md`: reglas visuales, tokens, tipografía y densidad.
- `docs/frontend-component-inventory.md`: contrato canónico de componentes compartidos, dominio y legacy.
- `docs/frontend-architecture-standard.md`: ubicación de rutas, pantallas y helpers.
- `docs/frontend-page-standard.md`: arquetipos y composición de página.
- `docs/frontend-ui-ux-operativo.md`: criterio de uso operativo.
- Documentos de dominio: reglas funcionales específicas de producto, caja, permisos, stock y ventas.
- `docs/archive/`: historia, auditorías y planes antiguos; no son instrucciones activas salvo que una tarea lo cite explícitamente.

Jira es la fuente de verdad para sprint, prioridad, ownership y estado. No usar `AGENTS.md` como backlog ni añadir aquí checklists temporales, reportes de auditoría o prompts para continuar chats.

## Forma de trabajo

1. Definir un objetivo funcional y un alcance acotado.
2. Revisar el dominio, ruta y componentes existentes necesarios para ese objetivo.
3. Implementar el cambio mínimo que resuelve el flujo.
4. Extraer una pieza compartida solo si la repetición quedó demostrada.
5. Verificar funcionalidad, permisos y regresiones visuales proporcionales al cambio.
6. Documentar únicamente decisiones duraderas o cambios de contrato.

Evitar campañas masivas de refactor de strings, selects, clases, aliases o carpetas. El refactor visual se realiza dentro del flujo funcional que se está trabajando, no como sustituto de avanzar producto.


## Contexto de trabajo activo

Para tareas frontend, leer antes de implementar:

1. `docs/INDEX.md`;
2. `docs/working/FRONTEND-WORKFLOW.md`;
3. `docs/working/IMPLEMENTATION-TRACKER.md`;
4. solo los documentos de dominio indicados por el índice.

No leer toda `docs/` ni usar `docs/archive/` como fuente de reglas activas por defecto. El código y las pruebas vigentes prevalecen si contradicen documentación.



## vexp <!-- vexp v2.1.2 -->

**MANDATORY: use `run_pipeline` - do NOT grep or glob the codebase.**
vexp returns pre-indexed, graph-ranked context in a single call.

### Workflow
1. `run_pipeline` with your task description - ALWAYS FIRST (replaces all other tools)
2. Make targeted changes based on the context returned
3. `run_pipeline` again only if you need more context

### Available MCP tools
- `run_pipeline` - **PRIMARY TOOL**. Runs capsule + impact + memory in 1 call.
  Auto-detects intent. Includes file content. Example: `run_pipeline({ "task": "fix auth bug" })`
- `get_skeleton` - compact file structure
- `index_status` - indexing status
- `expand_vexp_ref` - expand V-REF placeholders in v2 output

### Agentic search
- Do NOT use built-in file search, grep, or codebase indexing - always call `run_pipeline` first
- If you spawn sub-agents or background tasks, pass them the context from `run_pipeline`
  rather than letting them search the codebase independently

### Smart Features
Intent auto-detection, hybrid ranking, session memory, auto-expanding budget.

### Multi-Repo
`run_pipeline` auto-queries all indexed repos. Use `repos: ["alias"]` to scope. Run `index_status` to see aliases.
<!-- /vexp -->