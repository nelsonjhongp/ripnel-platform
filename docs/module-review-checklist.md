# Module Review Checklist

Guia paso a paso para auditar cualquier modulo frontend contra el gold standard (`ventas`).
Usar en conjunto con `docs/refactor-vs-rebuild.md` para decidir que hacer con los hallazgos.

> **Referencia canonica:** `components/modules/sales/` — el modulo mas pulido.
> **Documentos complementarios:** `AGENTS.md` (seccion patrones), `DESIGN.md`, `docs/frontend-page-standard.md`.

---

## Fase A: Arquitectura de archivos

### A.1 — File map

El modulo debe tener esta estructura minima. Marcar ausencias.

| Archivo | Obligatorio | Proposito |
|---------|:-----------:|-----------|
| `<module>-messages.ts` | Si | Strings centralizados, namespaced keys, español sin tildes |
| `<module>-types.ts` | Si | Interfaces y tipos del dominio |
| `<module>-constants.ts` | Si | Re-exporta de `ops-control-styles.ts` + constantes locales |
| `<module>-utils.ts` | Si | Funciones puras compartidas (parseo, formato, validacion) |
| `<module>-utils.ts` <500 lines | Si | Si excede, split por dominio |
| `use-<feature>.ts` × N | Si | Un hook por responsabilidad |
| `page.tsx` fino | Si | Solo importa el componente principal, `<100 lines` |
| Componente principal en `components/modules/<module>/` | Si | Toda la logica de UI |

**Comando rapido:**
```bash
ls components/modules/<module>/
```

### A.2 — Hook composition

Verificar que los hooks sigan el patron orquestador:

```
use<Module>Page()           ← orquestador (estado derivado + acciones)
  ├─ useSubDomainA()        ← hook enfocado
  ├─ useSubDomainB()
  └─ useSubDomainC()
```

**Anti-patron:** Un solo hook de 500+ lineas con toda la logica del modulo.

**Comando rapido:**
```bash
wc -l components/modules/<module>/*.ts
```

### A.3 — Utilities split

Las utils deben estar separadas por dominio si el archivo base excede ~300 lineas.

**Anti-patron:** Un solo `*-utils.ts` con 500+ lineas mezclando pricing, search, customers, summary.

**Patron correcto (ventas):**
```
pos-utils.ts (124 lines)          ← core: parseAmountInput, round2, createPaymentDraft
pos-pricing-utils.ts (263 lines)  ← calculateSalePreview, discounts, taxes
pos-search-utils.ts (156 lines)   ← groupVariantsByStyle, buildProductSearchResults
pos-customer-utils.ts (229 lines) ← validateCustomerForm, filterCustomersByDocumentType
pos-summary-utils.ts (284 lines)  ← deriveSummaryState + interfaces
```

**Comando rapido:**
```bash
grep -n "export function" components/modules/<module>/*-utils*.ts | wc -l
```

### A.4 — Message file exists and is used

- Existe `<module>-messages.ts`
- Exporta un objeto `const` con namespaces anidados
- Usa `as const` al final
- Template keys: funciones para strings dinamicos `(n: number) => \`${n} lineas\``
- Toast strings agrupadas bajo namespace `toast`

**Comando rapido:**
```bash
grep -c "as const" components/modules/<module>/*-messages.ts
```

### A.5 — Save action state machine

Todo dialog que crea/edita entidades debe usar una maquina de estados de 3 fases,
nunca un solo booleano `saving`:

```
"idle" → "validating" → "saving" → "idle"
```

- [ ] `actionState` usa `"idle" | "validating" | "saving"`
- [ ] `"validating"`: validacion local + chequeo de duplicado via API (sin POST/PATCH)
- [ ] `"saving"`: ejecuta el POST o PATCH real
- [ ] Boton `disabled` cuando `actionState !== "idle"`
- [ ] Cada fase muestra `<LoaderCircle className="animate-spin">` + texto distinto
- [ ] Al detectar error (validacion o duplicado), `actionState` vuelve a `"idle"` y el error se asigna al campo especifico

**Referencia canonica:** `customers-page.tsx` (funciones `saveEdit`, `handleCreateCustomer`).
**Anti-patron:** un solo `setSaving(true)` sin fase intermedia de validacion.

### A.6 — Duplicate detection guard

Cuando el backend tiene constraints de unicidad (ej. `document_type + document_number`), el frontend debe pre-verificar antes de enviar:

- [ ] Funcion `findDuplicateByX()` consulta la API con los valores del campo unico
- [ ] En edicion, pasa `excludeId` para no detectarse a si mismo
- [ ] Si encuentra duplicado, el error se asigna al campo especifico (ej. `{ document_number: "..." }`), no como error generico
- [ ] El backend tambien tiene constraint UNIQUE + mapeo de error 409 en el service

**Referencia canonica:** `customer-document-guard.ts` + `customers.service.js`.

---

## Fase B: Strings audit

### B.1 — Detectar strings hardcodeados

Buscar strings en español dentro de componentes y hooks. **Todo string visible al usuario debe referenciar una key del archivo de mensajes.**

```bash
# Buscar strings en español hardcodeados en tsx/ts del modulo
grep -rPn '(?<!import\s|[.])\"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}[^"]*\"' components/modules/<module>/ --include="*.tsx" --include="*.ts" | grep -v "messages.ts" | grep -v "test.ts"
```

### B.2 — Verificar cobertura

Para cada string encontrado en B.1, verificar:
- Si existe una key equivalente en `<module>-messages.ts` → usar esa key
- Si no existe → agregar la key al archivo de mensajes
- Si es aria-label/title atributo → considerar agregarlo (accesibilidad tambien es UX)

### B.3 — Placeholders y labels en inputs

- `placeholder` de inputs: referencia mensajes ✅
- `aria-label` de botones icono: referencia mensajes ✅
- `title` de tooltips: referencia mensajes ✅

### B.4 — Toast strings

- `showSuccess()`, `showError()`, `showInfo()` usan keys de mensajes ✅
- No hay strings literales como segundo argumento ✅

---

## Fase C: Componentes audit

### C.1 — OpsDialog

Todo modal debe cumplir:

- [ ] Usa `<OpsDialog>` (nunca dialog nativo ni otros wrappers)
- [ ] Tiene prop `description` (obligatorio)
- [ ] Footer usa patron canonico: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`
- [ ] Boton cancel: `variant="outline"` a la izquierda
- [ ] Boton confirm: `variant="accent"` a la derecha
- [ ] Boton destructive: `variant="destructive"` a la derecha
- [ ] Loading state: `<LoaderCircle className="animate-spin">` + texto + boton disabled
- [ ] Errores se limpian al abrir el dialog (`useEffect` sobre `open`)
- [ ] Errores se limpian al editar cada campo (`onChange`)

**Comando rapido:**
```bash
grep -rn "OpsDialog" components/modules/<module>/ --include="*.tsx" | wc -l
grep -rn "<dialog\|Dialog\s" components/modules/<module>/ --include="*.tsx" | grep -v OpsDialog | grep -v "import"
```

### C.2 — OpsPanelSection

- [ ] Secciones del grid usan `<OpsPanelSection>` con `title` + `icon`
- [ ] NO usan `<section> + <h2> + <article>` manual
- [ ] Tablas dentro de panel usan patron `-mx-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl`

**Anti-patron detectar:**
```bash
grep -rn "<section\|<h2\|<article" components/modules/<module>/ --include="*.tsx" | grep -v test
```

### C.3 — Inputs y selects

- [ ] Usan `OpsFormField` como wrapper (label, required asterisk, error)
- [ ] Usan `OpsSelect` + `OpsOption[]` (nunca `<select>` nativo)
- [ ] Usan `INPUT_CLASS` o `opsInputCompact` para estilos (no clases duplicadas)
- [ ] `SearchablePicker` para busquedas typeahead (productos, clientes)

**Anti-patron:**
```bash
grep -rn "<select\b" components/modules/<module>/ --include="*.tsx" | grep -v test
```

### C.4 — PosHeader

- [ ] `eyebrow` y `title` siempre son strings o ReactNode simples
- [ ] Status badge va en `meta`, nunca dentro de `title`/`<h1>`
- [ ] `actions` incluye back button, preview, dropdown overflow

### C.5 — Botones

- [ ] Primarios: `variant="accent"`
- [ ] Secundarios/cancel: `variant="outline"`
- [ ] Solo icono: `variant="ghost" size="icon-xs"`
- [ ] Toggles binarios: `OpsSegmentedControl` con `variant="switch" tone="accent"`

### C.6 — OpsStatusBadge

- [ ] Icono usa prop `icon`, no se pasa como child
- [ ] `tone` usa valores semanticos: `neutral`, `success`, `warning`, `danger`

### C.7 — Entry-mode switch (formularios con variantes de tipo)

Cuando una entidad tiene modos que cambian los campos requeridos (ej. persona_natural vs empresa, retail vs factura, ajuste positivo vs negativo):

- [ ] Usa `<OpsSegmentedControl>` con `variant="switch" tone="accent"` para el toggle
- [ ] Opciones del switch vienen del archivo de mensajes (nunca strings hardcodeadas)
- [ ] Cambiar de modo resetea todos los campos editables via `patchEntryMode()`
- [ ] Campos especificos de cada modo se renderizan condicionalmente (`{isEmpresa ? ... : ...}`)
- [ ] `required` en `OpsFormField` es dinamico segun el modo actual
- [ ] El switch solo se muestra en modo `"create"`, no en `"edit"` (en edicion el tipo ya esta definido)
- [ ] Modo editar sin switch muestra hint contextual (`INFO_BOX_MUTED` con `Info` icon) cuando el tipo de documento implica campos adicionales

**Referencia canonica:** `customer-form.tsx` (switch persona_natural/empresa en crear, hints en editar).

### C.8 — Errores per-campo

Los formularios con multiples campos editables deben usar errores tipados por campo, no un solo string generico:

- [ ] Existe un tipo de errores con keys opcionales por cada campo validable: `{ full_name?: string; document_number?: string; business_name?: string; address?: string }`
- [ ] La funcion de validacion (`validateInput`) retorna el tipo de errores o `null`
- [ ] Cada `<OpsFormField>` recibe su error individual via `error={errors?.campo}`
- [ ] Errores se limpian en `onChange` de cada campo (el dialog re-renderiza y el campo pierde el error)
- [ ] Todos los errores se limpian al abrir el dialog (`useEffect` sobre `open`)
- [ ] Validacion usa early return secuencial: un error a la vez, primer campo invalido detiene el flujo
- [ ] Errores del backend (409 duplicate, 400 validation) se mapean al campo correspondiente en el catch

**Referencia canonica:** `customers-utils.ts` (`validateCustomerInput` → `CustomerFormErrors`), `customer-form.tsx` (`errors` prop → `OpsFormField.error`).

---

## Fase D: CSS audit

### D.1 — color-mix() location

Todo `color-mix()` debe residir **exclusivamente** en `components/ui/ops-control-styles.ts`.

```bash
# Buscar color-mix fuera de ops-control-styles.ts
grep -rn "color-mix" components/modules/<module>/ --include="*.tsx" --include="*.ts"
grep -rn "color-mix" components/ --include="*.tsx" --include="*.ts" | grep -v ops-control-styles
```

### D.2 — CSS class constants

- [ ] El modulo re-exporta constantes de `ops-control-styles.ts` via su propio `*-constants.ts`
- [ ] Usa los nombres canonicos: `INFO_BOX`, `INFO_BOX_MUTED`, `INFO_BOX_XL`, `SURFACE_MUTED_BG`, `ACCENT_HIGHLIGHT_PANEL`, etc.
- [ ] No duplica strings de clases CSS inline

### D.3 — Double-wrapping check

Constantes como `ACCENT_HOVER_BORDER`, `SUBTLE_BORDER`, `MUTED_SURFACE_MIX`, `ACCENT_MUTED_BG` son valores crudos `[color:color-mix(...)]` que deben usarse como:

```tsx
// Correcto:
className={`border-${SUBTLE_BORDER} bg-${MUTED_SURFACE_MIX}`}

// Incorrecto (double bracket):
className={`border-[${SUBTLE_BORDER}] bg-[${MUTED_SURFACE_MIX}]`}
```

```bash
# Detectar double-wrapping
grep -rn "bg-\[\\$\{" components/modules/<module>/ --include="*.tsx"
grep -rn "border-\[\\$\{" components/modules/<module>/ --include="*.tsx"
grep -rn "text-\[\\$\{" components/modules/<module>/ --include="*.tsx"
```

### D.4 — CSS modules vs Tailwind

- No importar archivos `.module.css` nuevos. Todo el estilo es Tailwind + tokens CSS.

---

## Fase E: Page type compliance

Determinar el tipo de pagina y verificar contra el estandar.

### E.1 — Determinar tipo

| Tipo | Ejemplo canonico | Caracteristicas |
|------|-----------------|-----------------|
| **Listado** | `/ventas/historial` | Header → KPIs → filtros → tabla → paginacion |
| **Detalle** | `/ventas/[saleId]` | Header unificado (INFO_BOX_XL) → grid main+sidebar |
| **Formulario operativo** | `/ventas/nueva` (POS) | Wizard/stages, sidebar resumen, sin tabla de listado |
| **Settings/cuenta** | `/cuenta` | Ancho contenido, sin KPIs, superficie continua |

### E.2 — Verificar tipo listado

- [ ] `PosHeader` con titulo sin subtitulo ni descripcion
- [ ] KPIs antes de la tabla (metric pills, no cards)
- [ ] Filtros con labels compactos
- [ ] Tabla usa `border-y` no `rounded`
- [ ] Paginacion numerada canonica (10 filas default)
- [ ] No tiene refresh button que compita con filtros primarios
- [ ] **Paginacion server-side cableada correctamente:**
  - [ ] Frontend envia `page` y `limit` como query params a la API
  - [ ] `page` se resetea a 1 en cada `onChange` de filtro (query, tipo, orden)
  - [ ] `page` esta en el array de dependencias de `useApiGet`
  - [ ] `safePage` se calcula: `Math.max(1, Math.min(page, totalPages))`
  - [ ] `totalPages` se deriva de `total / pageSize` del servidor
  - [ ] Backend usa `COUNT(*)` + `LIMIT/OFFSET`, devuelve `{ data, total }`
  - [ ] Sin `page` en el request → backend devuelve todos (compatibilidad con busquedas typeahead)

### E.3 — Verificar tipo detalle

- [ ] `INFO_BOX_XL` como panel header unificado
  - Left: doc type, date, location, customer name, document number, seller, created, confirmed
  - Right: `ACCENT_HIGHLIGHT_PANEL` con total + paid + partial badge + missing
  - Bottom: notes (condicional, `border-t`)
- [ ] Grid: `lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start`
- [ ] Sidebar: `lg:sticky lg:top-20` con orden fijo (Totals → Payments)
- [ ] `OpsPanelSection` con `title` + `icon` para cada seccion del grid
- [ ] Tabla dentro de panel usa `-mx-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl`
- [ ] Child components NO se envuelven a si mismos en `OpsPanelSection`

### E.4 — Verificar formulario operativo

- [ ] Usa `OpsPageShell` con `width="wide"`
- [ ] Secciones compactas con `OpsStepSectionHeading`
- [ ] Sidebar/lateral con resumen sticky
- [ ] Controles densos (`h-9`, `size="sm"`, `density="compact"`)

### E.5 — Verificar settings/cuenta

- [ ] Ancho contenido estrecho (`width="narrow"`)
- [ ] Stack vertical continuo de secciones (no grid de cards)
- [ ] Sin KPIs ni tabla de datos
- [ ] Sin breadcrumbs ni subtitulos de pagina largos

---

## Fase F: Anti-patterns scan

Escanear contra la lista consolidada de anti-patrones del proyecto.

### F.1 — Anti-patrones de componentes

```bash
# Badge dentro de h1 / PosHeader.title
grep -rn "<h1.*OpsStatusBadge\|OpsStatusBadge.*h1" components/modules/<module>/ --include="*.tsx"

# section + h2 + article en vez de OpsPanelSection
grep -rn "<section" components/modules/<module>/ --include="*.tsx" | grep -v "StageSection\|import"

# <select> nativo
grep -rn "<select\b" components/modules/<module>/ --include="*.tsx" | grep -v "import\|OpsSelect"

# <p> como footer de modal
grep -rn "OpsDialog" -A 20 components/modules/<module>/ --include="*.tsx" | grep "<p" | grep -i "footer\|close\|cancel"
```

### F.2 — Anti-patrones de estado

- [ ] `setOpen(true)` dentro de handlers de cierre de dialog/picker
- [ ] Duplicar logica de `deriveSummaryState` en lugar de usar la funcion pura
- [ ] `as any` o `Record<string, unknown>` para campos que existen en el type
- [ ] `openOnFocus` en picker compitiendo con logica de cierre explicita

### F.3 — Anti-patrones visuales

- [ ] `color-mix()` fuera de `ops-control-styles.ts`
- [ ] Cards decorativas con sombras grandes en vistas operativas
- [ ] Padding excesivo en filas de tabla (> `py-[var(--ops-row-py)]`)
- [ ] `rounded` en tablas o etiquetas de tabla
- [ ] Botones `variant="accent"` como background de areas grandes
- [ ] Tooltips en campos auto-explicativos
- [ ] Texto descriptivo persistente cuando labels y acciones ya comunican el proposito
- [ ] Radio-cards expandidas para selecciones de pocas opciones (preferir `select`)

### F.4 — Anti-patrones de detalle

- [ ] Customer/operation info en sidebar en vez de `INFO_BOX_XL`
- [ ] `ACCENT_HIGHLIGHT_PANEL` flotando fuera de `INFO_BOX_XL`
- [ ] Child component wrappeandose en `OpsPanelSection` (el parent lo hace)
- [ ] IGV row siempre visible (debe ocultarse cuando es 0)
- [ ] PDF route incorrecta (proforma vs boleta/factura)

---

## Fase G: Testing & verification

### G.1 — Tests

```bash
# Existen tests?
ls __tests__/*<module>*.test.ts 2>/dev/null
# Cuantos tests pasan?
npx playwright test --reporter=dot 2>&1 | tail -5
```

- [ ] Al menos tests para funciones puras (utils, pricing, summary derivation)
- [ ] No hay tests rotos que requieran `--update-snapshots`

### G.2 — TypeScript

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] 0 errores de tipo en el modulo

### G.3 — Lint

```bash
npx next lint 2>&1 | head -20
```

- [ ] 0 warnings/errores de lint en archivos del modulo

### G.4 — Dead code check

- [ ] No hay imports no usados
- [ ] No hay props declaradas en interfaces que nunca se leen en el componente
- [ ] No hay funciones exportadas que ningun consumidor importa

```bash
# Encontrar props no usadas (requiere grep manual)
grep -rn "import.*from.*<module>" components/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

---

## Scoring

Contar hallazgos por severidad:

| Severidad | Peso | Ejemplos |
|-----------|------|----------|
| 🔴 Critica | ×3 | Sin archivo de mensajes, color-mix disperso, `<select>` nativo, `<AdminModalShell>` en vez de `OpsDialog`, paginacion client-side con 500+ filas en memoria, sin entry-mode switch cuando los campos cambian por tipo |
| 🟡 Mayor | ×2 | Strings hardcodeados >5, hook >500 lines sin split, dialogs sin `description`, sin two-phase save (validacion + guardado), sin per-field errors, sin `useEffect(open)` para reset |
| 🟢 Menor | ×1 | aria-labels hardcodeados, imports no usados, tooltip redundante, sin `LoaderCircle` en boton de submit, document_number sin contador ni normalizacion |

**Formula:** `Score = (🔴 × 3) + (🟡 × 2) + (🟢 × 1)`

### Interpretacion

| Score | Banda | Accion recomendada |
|-------|-------|--------------------|
| 0-5 | ✅ Verde | Listo. Solo ajustes cosmeticos si se desea. |
| 6-15 | ⚠️ Amarillo | Refactor moderado. Usar `docs/refactor-vs-rebuild.md` Tier 2. |
| 16-30 | 🔶 Naranja | Refactor mayor. Tier 3. Planificar en fases. |
| 31+ | 🔴 Rojo | Evaluar rebuild. Tier 4. Ver `docs/refactor-vs-rebuild.md`. |

---

## Referencias rapidas

| Tema | Documento |
|------|-----------|
| Patrones de componentes | `AGENTS.md` → "Shared components", "Frontend component patterns" |
| Anti-patrones completos | `AGENTS.md` → "Anti-patterns (do NOT do)" |
| Sistema de diseño | `DESIGN.md` |
| Estandares de pagina | `docs/frontend-page-standard.md` |
| Criterios UX operativo | `docs/frontend-ui-ux-operativo.md` |
| Convenciones de sintaxis | `docs/frontend-architecture-standard.md` |
| Componentes operativos | `docs/frontend-operational-components.md` |
| Arquitectura POS canonica | `docs/frontend-pos-architecture.md` |
| Paginacion server-side | `docs/backend-pagination-standard.md` |
| Decidir refactor vs rebuild | `docs/refactor-vs-rebuild.md` |
| CSS class constants | `components/ui/ops-control-styles.ts` |
| CRUD template (listado + dialogo) | `components/modules/customers/` — modulo de referencia |
