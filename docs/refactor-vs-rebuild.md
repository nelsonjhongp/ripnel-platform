# Refactor vs Rebuild Decision Guide

Marco para decidir si un modulo se arregla incrementalmente (refactor) o se reescribe
desde `page.tsx` (rebuild). Usar despues de ejecutar `docs/module-review-checklist.md`.

---

## Decision Matrix

Evaluar cada criterio. Si la mayoria apunta a una columna, esa es la direccion.

| Criterio | Refactor | Rebuild |
|----------|----------|---------|
| **Lineas de codigo a modificar** | <40% del modulo | >50% del modulo |
| **Anti-patrones criticos (🔴)** | 0-3 | 4+ |
| **Archivo de mensajes** | Existe, parcialmente usado | No existe o totalmente ignorado |
| **Hook composition** | Orquestador existe, solo ajustar | Un solo hook monolito sin split |
| **Componentes usados** | Mayormente Ops* canonicos | Raw HTML, otras librerias, componentes deprecados |
| **CSS approach** | Tailwind + tokens CSS | CSS modules, styled-jsx, inline styles |
| **Tests** | Existen, pasan | No existen o todos rotos |
| **Estado del backend** | API estable, tipos definidos | API en flujo, cambia seguido |
| **Complejidad de dominio** | Baja-media (CRUD, listados) | Alta (flujos multi-step, estado distribuido) |
| **Deuda en UI/UX** | Layout funcional, mejorar densidad | Layout roto, flujo confuso para el usuario |
| **Tiempo desde ultimo cambio** | <3 meses | >6 meses sin mantenimiento |

---

## Sistema de Tiers

### Tier 1: Cosmetico

**Que es:** El modulo funciona, la arquitectura es correcta, solo hay detalles.

**Hallazgos tipicos:**
- 1-5 strings hardcodeados
- 1-2 aria-labels sin mensaje
- Imports no usados
- Tooltip redundante en campo auto-explicativo
- Una constante CSS duplicada

**Score checklist:** 0-5 (🟢 Verde)

**Duracion estimada:** 1-2 horas

**Accion:**
1. Agregar strings faltantes a `<module>-messages.ts`
2. Reemplazar strings hardcodeados por keys
3. Limpiar imports
4. Verificar typecheck + tests

**Ejemplo:** Modulo `customers` — ya usa `OpsDialog`, `OpsSelect`, tiene mensajes; solo se encontraron 3 strings en aria-labels.

---

### Tier 2: Estructural

**Que es:** El modulo funciona pero tiene vicios arquitectonicos que creceran con el tiempo.

**Hallazgos tipicos:**
- 6-15 strings hardcodeados
- 1-3 `color-mix()` fuera de `ops-control-styles.ts`
- 1-2 `<select>` nativos
- Utils >500 lineas sin split
- Hook >400 lineas pero logica separable
- 2-3 dialogs sin `description` o footer no canonico
- Sin tests

**Score checklist:** 6-15 (🟡 Amarillo)

**Duracion estimada:** 4-8 horas

**Accion:**
1. Centralizar strings
2. Extraer `color-mix()` a `ops-control-styles.ts`
3. Reemplazar `<select>` por `OpsSelect`
4. Split de utils por dominio
5. Extraer sub-hooks del orquestador
6. Corregir dialogs (description, footer, loading)
7. Agregar tests para funciones puras
8. Verificar typecheck + tests + lint

**Ejemplo hipotetico:** Modulo `inventory` — 480 lineas en utils mezclando movimientos, ajustes, kardex; 2 selects nativos; 8 strings hardcodeados.

---

### Tier 3: Refactor mayor

**Que es:** El modulo tiene deuda significativa pero la logica de negocio y el backend son solidos. Conviene re-arquitecturar por partes, no tirar todo.

**Hallazgos tipicos:**
- 16-30 strings hardcodeados (casi todo)
- 4+ `color-mix()` dispersos
- Multiples `<select>` nativos
- Sin archivo de mensajes o minimo
- Hook monolito 600+ lineas
- `section + h2 + article` en vez de `OpsPanelSection`
- Dialogs sin patron canonico (muchos)
- Page type no coincide con el estandar
- CSS modules o clases propias compitiendo con Tailwind
- Sin tests

**Score checklist:** 16-30 (🔶 Naranja)

**Duracion estimada:** 1-3 dias

**Accion (por fases):**

**Fase A — Cimientos (4h):**
1. Crear `<module>-messages.ts` con todos los strings
2. Crear/actualizar `<module>-constants.ts` re-exportando de `ops-control-styles.ts`
3. Reemplazar todos los strings hardcodeados
4. Extraer todo `color-mix()` a `ops-control-styles.ts`

**Fase B — Componentes (4h):**
5. Reemplazar `<select>` por `OpsSelect`
6. Reemplazar `section+h2+article` por `OpsPanelSection`
7. Migrar dialogs a `OpsDialog` con patron canonico
8. Corregir header (PosHeader con meta, no badge en title)

**Fase C — Arquitectura (4h):**
9. Split de utils por dominio
10. Split del hook orquestador en sub-hooks
11. Ajustar page type al estandar (lista, detalle, form)

**Fase D — Verificacion (2h):**
12. Typecheck
13. Agregar tests para funciones puras
14. Lint

**Ejemplo real:** `ventas` (POS) — era Tier 3. Tenia 807 lineas en el orquestador, strings dispersos, `color-mix()` en utils. Se completo en 5 fases documentadas en AGENTS.md hardening checklist.

---

### Tier 4: Rebuild

**Que es:** El modulo esta tan desalineado que arreglarlo pieza por pieza tomaria mas tiempo y riesgo que rehacerlo usando los patrones canonicos desde `page.tsx`.

**Hallazgos tipicos:**
- 31+ score en checklist
- >50% del codigo necesita cambiar
- 5+ anti-patrones criticos
- Usa librerias o patrones deprecados (ej: class components, CSS modules, otra UI library)
- Layout fundamentalmente roto (no es cuestion de ajustar padding)
- Flujo de usuario confuso o incompleto
- API backend cambia o no existe
- Sin tests y la logica esta enredada con UI

**Score checklist:** 31+ (🔴 Rojo)

**Duracion estimada:** 3-5 dias

**Accion:**

1. **Auditar backend primero** — verificar que los endpoints necesarios existen y devuelven los tipos correctos
2. **Crear el file map** desde cero siguiendo `ventas` como template:
   ```
   components/modules/<module>/
   ├── <module>-messages.ts
   ├── <module>-types.ts
   ├── <module>-constants.ts
   ├── <module>-utils.ts (core)
   ├── <module>-<domain>-utils.ts (× N si aplica)
   ├── use-<feature>.ts (× N, un hook por responsabilidad)
   ├── <module>-page.tsx (componente principal)
   ├── stage-<section>.tsx (× N si es wizard)
   └── <module>-dialogs/
       └── <dialog-name>.tsx (× N)
   ```
3. **Escribir los mensajes primero** — todas las strings visibles antes de cualquier JSX
4. **Escribir los tipos** — interfaces para API responses y estado interno
5. **Implementar hooks** — logica de negocio pura, testeable
6. **Implementar UI** — usando solo componentes canonicos Ops*
7. **Escribir tests** — al menos para utils y hooks
8. **Migrar datos/estado** — si hay localStorage, URL params, etc.
9. **Redirigir rutas** — mantener URLs antiguas con redirects en `next.config.ts`
10. **Eliminar codigo viejo** — solo cuando el nuevo este en prod y estable

**Que NO se bota:**
- Logica de negocio pura (calculo de precios, validaciones, transformaciones)
- Tipos e interfaces que sigan siendo validos
- Backend routes, controllers, services (son backend, no frontend)
- Migraciones de base de datos

**Que SI se reescribe:**
- Toda la capa de presentacion (JSX/TSX)
- Hooks y estado
- Utils (aprovechando logica rescatable)
- Mensajes (centralizados desde cero)

---

## Ejemplos aplicados

### Ventas (POS + historial + detalle)

| Criterio | Antes (Ene 2026) | Evaluacion |
|----------|------------------|------------|
| Archivo de mensajes | Existia, parcial | 🟡 |
| Hook orquestador | 807 lineas, mezclado | 🔴 |
| strings hardcodeados | ~25 en utils y stages | 🟡 |
| color-mix disperso | 2 en pos-utils.ts | 🟡 |
| Componentes | 100% canonicos | ✅ |
| Tests | 71 tests existentes | ✅ |

**Score:** ~18 → 🔶 Tier 3. **Resultado:** Refactor completado en 5 fases.

### Postsales (estimado)

| Criterio | Probable estado | Evaluacion |
|----------|----------------|------------|
| Archivo de mensajes | Probablemente parcial | 🟡 |
| Hook estructura | Desconocido | ? |
| Componentes | Usa OpsDialog, OpsPanelSection | ✅ |
| Page types | Detalle parece correcto | ✅ |

**Probable Tier:** 1-2. **Requiere auditoria primero.**

### Modulo nuevo desde cero

Usar Tier 4 como guia de creacion, no como indicador de problema.
El file map y orden de implementacion del Tier 4 aplican igual.

---

## Regla de oro

> **Refactoriza cuando el esqueleto es sano. Rebuild cuando el esqueleto esta roto.**

"Esqueleto sano" significa:
- Los datos entran y salen correctamente (API estable)
- Los tipos representan la realidad
- La arquitectura de archivos es reconocible (hooks, utils, messages)
- Los componentes principales son los canonicos (OpsDialog, OpsSelect, OpsPanelSection)

"Esqueleto roto" significa:
- Usa otra libreria de componentes o HTML nativo para todo
- Los datos se pasan por props de forma impredecible
- No hay separacion entre logica y presentacion
- El flujo de usuario no es rescatable (confunde al operador)
