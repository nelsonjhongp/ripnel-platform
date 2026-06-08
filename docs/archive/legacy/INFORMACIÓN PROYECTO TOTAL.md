# RIPNEL Platform - INFORMACIÓN TOTAL DEL PROYECTO

> Documento consolidado que integra toda la documentación del proyecto: README, guías técnicas, diseño, arquitectura, flujos operativos, seguridad, testing y referencias.

---

## ÍNDICE

1. [VISIÓN GENERAL](#1-visión-general)
2. [ARQUITECTURA DEL PROYECTO](#2-arquitectura-del-proyecto)
3. [STACK TECNOLÓGICO](#3-stack-tecnológico)
4. [INICIO RÁPIDO](#4-inicio-rápido)
5. [VARIABLES DE ENTORNO](#5-variables-de-entorno)
6. [ESTRUCTURA DEL REPOSITORIO](#6-estructura-del-repositorio)
7. [DISEÑO Y SISTEMA DE TOKENS](#7-diseño-y-sistema-de-tokens)
8. [ESTÁNDARES DE FRONTEND](#8-estándares-de-frontend)
9. [ARQUITECTURA DE FRONTEND](#9-arquitectura-de-frontend)
10. [COMPONENTES OPERATIVOS](#10-componentes-operativos)
11. [CONVENCIONES DE BACKEND](#11-convenciones-de-backend)
12. [API BASELINE](#12-api-baseline)
13. [MÓDULOS DE NEGOCIO](#13-módulos-de-negocio)
14. [FLUJO DE PRODUCTO](#14-flujo-de-producto)
15. [FLUJO DE VENTAS MVP](#15-flujo-de-ventas-mvp)
16. [FLUJO DE CAJA](#16-flujo-de-caja)
17. [SISTEMA DE PERMISOS Y ROLES](#17-sistema-de-permisos-y-roles)
18. [SEGURIDAD BACKEND](#18-seguridad-backend)
19. [WORKFLOW BACKEND Y SUPABASE](#19-workflow-backend-y-supabase)
20. [TESTING](#20-testing)
21. [PRIORIDADES SIGUIENTES](#21-prioridades-siguientes)
22. [DOCUMENTACIÓN TÉCNICA](#22-documentación-técnica)

---

## 1. VISIÓN GENERAL

RIPNEL Platform es un ERP MVP enfocado en inventario, ventas, precios y transferencias internas para **Creaciones Ripnel**. Está diseñado con arquitectura portable: frontend separado del backend, lógica de negocio en backend, y PostgreSQL administrado en Supabase con SQL explícito sin ORM.

### Propósito

Cubrir el flujo base de un ERP comercial:
- Catálogos operativos
- Ubicaciones
- Estilos de producto
- Variantes con SKU
- Precios
- Movimientos posteriores de inventario, ventas y transferencias

---

## 2. ARQUITECTURA DEL PROYECTO

| Ruta | Rol |
|------|-----|
| `apps/frontend` | Aplicación web en Next.js con App Router |
| `apps/backend` | API en Node.js + Express |
| `database` | Snapshots y referencias SQL |
| `supabase` | Migraciones, config local y seeds base |
| `docs` | Documentación técnica estable del proyecto |

### Reglas Arquitectónicas

- Frontend debe llamar a backend APIs para operaciones ERP
- Backend trata Supabase como PostgreSQL administrado
- No usar `supabase-js` como base del backend
- No conectar frontend directamente a tablas de BD para flujos ERP
- Mantener CommonJS en backend
- Mantener SQL explícito con `pg`
- Preferir archivos modulares pequeños sobre controladores grandes

---

## 3. STACK TECNOLÓGICO

### Frontend

| Tecnología | Versión |
|-----------|---------|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| shadcn/ui | - |
| Radix UI primitives | - |
| lucide-react | - |
| @tanstack/react-table | - |
| recharts | - |
| date-fns | - |
| react-day-picker | - |
| @dnd-kit/* | - |
| next-themes | - |
| sonner | - |
| zod | - |
| class-variance-authority, clsx, tailwind-merge | - |

### Backend

| Tecnología | Versión |
|-----------|---------|
| Node.js | 22 |
| Express | 5 |
| pg | - |
| jsonwebtoken | - |
| bcrypt | - |
| helmet | - |
| express-rate-limit | - |
| zod | - |

### Base de Datos

| Tecnología | Versión |
|-----------|---------|
| PostgreSQL | 17 |
| Supabase (hosting) | - |

### Infraestructura

| Servicio | Uso |
|---------|-----|
| Vercel | Deploy frontend |
| Supabase | PostgreSQL administrado |
| GitHub Actions | CI pipeline |
| Figma | Diseño |

---

## 4. INICIO RÁPIDO

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

Frontend por defecto: `http://localhost:3000`
Backend por defecto: `http://localhost:3001`

### Comandos útiles

```bash
npm.cmd install                                        # Instalar dependencias
npm.cmd --workspace @ripnel/frontend run lint          # Lint frontend
npm.cmd --workspace @ripnel/frontend run build         # Build frontend
npm test                                               # Tests backend (node:test)
```

---

## 5. VARIABLES DE ENTORNO

### Backend (`apps/backend/.env`)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor |
| `NODE_ENV` | Entorno (development, production) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar JWT |
| `FRONTEND_URL` | URL del frontend (CORS) |

**Variables SUNAT/APISUNAT:**

| Variable | Descripción |
|----------|-------------|
| `APISUNAT_ENABLED` | `true|false` — en `false` la venta se confirma sin intentar emisión |
| `APISUNAT_RETRY_JOB_ENABLED` | `true|false` — activa worker de reintentos en background |
| `APISUNAT_RETRY_INTERVAL_MS` | Intervalo del worker en milisegundos |
| `APISUNAT_RETRY_BATCH_SIZE` | Máximo de comprobantes a reintentar por ciclo |

**Notas operativas SUNAT:**
- Si APISUNAT presenta caídas o errores internos, usar `APISUNAT_ENABLED=false` para mantener operación de caja/inventario
- Cuando el proveedor se recupere, volver a `APISUNAT_ENABLED=true` y ejecutar reintentos pendientes

### Frontend (`apps/frontend/.env.local`)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL base de la API backend |

---

## 6. ESTRUCTURA DEL REPOSITORIO

```
ripnel-platform/
├── apps/
│   ├── frontend/           # Next.js App Router
│   │   ├── app/            # Rutas de Next.js
│   │   │   └── (protected)/ # Rutas protegidas (requieren auth)
│   │   ├── components/
│   │   │   ├── ui/         # Componentes base (shadcn/ui)
│   │   │   ├── modules/    # Pantallas por dominio
│   │   │   │   ├── sales/
│   │   │   │   ├── postsales/
│   │   │   │   ├── cash/
│   │   │   │   ├── administration/
│   │   │   │   └── ...
│   │   │   ├── auth/
│   │   │   └── sidebar/
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilidades, rutas, API calls
│   │   └── globals.css     # Tokens de diseño
│   └── backend/            # Node.js + Express API
│       └── src/
│           ├── config/     # Env y configuración
│           ├── middlewares/ # Express middlewares
│           ├── modules/    # Módulos de negocio
│           │   └── <module>/
│           │       ├── *.routes.js
│           │       ├── *.controller.js
│           │       ├── *.service.js
│           │       └── *.repo.js
│           ├── shared/     # DB connection, schemas, errores
│           └── __tests__/  # Tests automatizados
├── database/               # Snapshots y scripts SQL
├── supabase/               # Migraciones y configuración local
│   └── migrations/         # Migraciones SQL versionadas
├── docs/                   # Documentación técnica
├── .github/workflows/      # CI pipeline
├── AGENTS.md               # Guía del proyecto para asistentes
├── DESIGN.md               # Sistema de diseño
└── README.md               # README principal
```

---

## 7. DISEÑO Y SISTEMA DE TOKENS

### Identidad

| Token | Valor | Uso |
|-------|-------|-----|
| Brand | Creaciones Ripnel | Sidebar, headers |
| Accent | `#b07ae4` | Acciones primarias, focus, selección |
| Accent Hover | `#9a63d3` | Hover de elementos accent |
| Accent Soft | `#f7effd` | Fondos soft accent |
| Font | Poppins | Toda la tipografía (sans-serif) |

### Sistema de Color

**Brand & Accent**

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `primary` | `#b07ae4` | `#8e5db7` | Accent primario, focus rings, CTAs |
| `primary-hover` | `#9a63d3` | `#7b4ea3` | Hover accent |
| `accent-soft` | `#f7effd` | `rgb(142 93 183 / 0.22)` | Fondos soft accent |

**Superficies (ops-*)**

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `ops-page-background` | `#ffffff` / gradient | `#171717` | Fondo de página |
| `ops-surface` | `#ffffff` | `#1f1f1f` | Cards, paneles |
| `ops-surface-muted` | `#faf7fd` | `#252525` | Superficies muted |
| `ops-field` | `#f8fafc` | `#252525` | Fondos de input |
| `ops-text` | `#171717` | `#fafafa` | Texto principal |
| `ops-text-muted` | `#72687f` | `#b4b4b4` | Texto secundario |
| `ops-border-strong` | `#e5e1ea` | `#2e2e2e` | Bordes default |
| `ops-border-soft` | `#d8d0e2` | `#484848` | Bordes sutiles |

**Semánticos**

| Estado | Light | Dark |
|--------|-------|------|
| Success | `#ecfdf5` bg, `#047857` text | rgb(16 185 129 / 0.18) bg, `#a7f3d0` text |
| Warning | `#fffbeb` bg, `#b45309` text | rgb(245 158 11 / 0.18) bg, `#fcd34d` text |
| Danger | `#fff1f2` bg, `#be123c` text | rgb(244 63 94 / 0.18) bg, `#fda4af` text |
| Neutral | `#faf7fd` bg, `#72687f` text | `#252525` bg, `#b4b4b4` text |

### Tipografía

**Familia:** Poppins (400, 500, 600, 700)

| Token | Size | Weight | Line H | Letter Spacing | Uso |
|-------|------|--------|--------|----------------|-----|
| `display-xl` | 2rem / 32px | 700 | 1.1 | -0.02em | Hero titles |
| `display-lg` | 1.75rem / 28px | 700 | 1.15 | -0.01em | Page h1 |
| `headline` | 1.5rem / 24px | 600 | 1.2 | 0 | Section titles |
| `title` | 1.25rem / 20px | 600 | 1.25 | 0 | Card titles |
| `body-lg` | 1rem / 16px | 400 | 1.5 | 0 | Lead paragraphs |
| `body` | 0.875rem / 14px | 400 | 1.5 | 0 | Default body |
| `body-sm` | 0.8125rem / 13px | 400 | 1.4 | 0 | Secondary text |
| `caption` | 0.75rem / 12px | 400 | 1.4 | 0 | Labels, metadata |
| `eyebrow` | 0.6875rem / 11px | 600 | 1.3 | 0.12em | Section eyebrows, uppercase |

### Espaciado (base 4px)

| Token | Value | Uso |
|-------|-------|-----|
| `ops-page-py` | 1.5rem / 24px | Page vertical padding |
| `ops-stack-gap` | 1rem / 16px | Vertical gaps entre secciones |
| `ops-panel-padding` | 1.25rem / 20px | Panel/card padding |
| `ops-row-py` | 1rem / 16px | Row vertical padding |
| `ops-row-gap` | 0.75rem / 12px | Gap entre row items |
| `ops-metric-py` | 0.625rem / 10px | Metric pill vertical padding |
| `ops-metric-px` | 0.875rem / 14px | Metric pill horizontal padding |

### Border Radius

| Token | Value | Uso |
|-------|-------|-----|
| `sm` | 0.375rem / 6px | Elementos pequeños |
| `md` | 0.625rem / 10px | Botones, inputs, chips |
| `lg` | 0.75rem / 12px | Cards, paneles |
| `xl` | 1rem / 16px | Paneles grandes |
| `2xl` | 1.25rem / 20px | Overlays |
| `full` | 9999px | Avatares, pills |

### Componentes Clave

**Botones:**
- `button-primary`: bg `#b07ae4`, text white, padding 8px 14px, border-radius md (10px)
- `button-secondary`: bg `ops-surface`, border 1px solid, text `ops-text`
- `button-ghost`: transparente, text `ops-text-muted`
- `button-icon`: icon-only con tooltip, 32x32 o 40x40

**Inputs:**
- `sales-field`: bg `ops-field`, border `ops-border-strong`, focus ring accent
- `sales-field-interactive`: con hover states (border accent, bg accent-soft)

**Chips & Badges:**
- `sales-chip`: neutro, border `ops-border-strong`
- `sales-chip-accent`: accent border + accent-soft bg
- `sales-chip-success/warning/danger`: semánticos
- `sales-chip-neutral`: muted

**Cards & Paneles:**
- `ops-surface`: bg white, border, radius lg, padding panel
- `ops-surface-muted`: bg muted, border soft
- `ops-empty-state`: dashed border, muted bg

**Wizard:**
- `sales-wizard-shell`: flex column, gap 0.875rem
- `sales-wizard-node`: 44x44, full rounded, active/complete states
- `sales-wizard-connector`: 1px height, accent when complete

### Temas

**Light Violet (default):**
```css
--ops-page-background: radial-gradient(circle at top, #ede9fe 0%, #f5f3ff 35%, #f8fafc 70%, #eef2ff 100%);
--ops-surface: rgb(255 255 255 / 0.92);
--theme-sidebar-primary: #4f46e5;
```

**Dark (Graphite):**
```css
--background: #171717;
--foreground: #fafafa;
--card: #1f1f1f;
--accent: #8e5db7;
--primary: #8e5db7;
```

### Do's and Don'ts

**Do:**
- Usar `ops-*` tokens para superficies, bordes y texto
- Mantener filas densas — ERP lists prioritizan scan speed
- Usar accent con moderación — focus, selection, primary action only
- Soportar temas claro y oscuro completamente
- Usar colores semánticos correctamente
- Preferir chips sobre cards para etiquetas categóricas
- Usar `sales-field` para inputs interactivos

**Don't:**
- No usar accent como background (usar `accent-soft`)
- No crear layouts card-heavy (preferir tablas densas)
- No usar gradientes decorativos
- No mezclar colores semánticos
- No saltar focus states
- No usar `rounded-full` en botones, inputs o contenedores de tabla
- No usar `rounded-*` en contenedores de tabla (usar `border-y`)

---

## 8. ESTÁNDARES DE FRONTEND

### Page Shell

La página se construye por módulos: `header` → `kpis` (opcional) → separador → `bloque tabla` (filtros + tabla + paginación).

Reglas:
- Respetar tema activo usando tokens existentes
- Ancho según tipo de contenido (contenido para formularios, amplio para tablas)
- Espaciado vertical compacto
- No duplicar breadcrumb de SidebarShell

### Header

- `eyebrow` (11px, semibold, uppercase, tracking amplio) en color accent
- `title` (1.5rem base, 1.75rem en pantallas amplias, semibold) — h1 principal
- `actions` compactas a la derecha
- NO lleva subtitle ni description visible
- Referencia: `PosHeader`

### KPIs

- Opcionales, no por inercia
- Como pills/chips compactos, no cards grandes
- Jerarquía: neutro + principal con accent + secundario semántico
- Separador sutil antes del bloque tabla
- No duplicar conteo que ya muestra paginación

### Tabla

- Módulo único: filtros + tabla + paginación como un solo bloque
- Headers compactos, uppercase
- Filas densas con `ops-row-py`
- Priorizar acciones directas por fila
- `border-y` sin bordes redondeados
- Thead con `bg-[var(--ops-surface-muted)]`
- Th: `text-xs font-semibold uppercase tracking-[0.16em]`
- Td: `px-4 py-[var(--ops-row-py)]`
- Tr: `transition hover:bg-[var(--ops-surface-muted)]`

### Filtros

- Búsqueda primero (patrón base en entidades buscables)
- Filtros específicos después (estado, tipo, sede)
- Fechas desde/hasta cuando aplica
- Acción limpiar: icon-only con tooltip
- Refresh: acción secundaria del header, no compite con filtros

### Paginación

- Default: 10 filas por página
- Rango visible: `1-10 de N`
- Labels en español: `Anterior` / `Siguiente`
- Paginación numerada compacta para listados amplios
- Elipsis cuando muchas páginas

### Referencia Canónica

La implementación de `customers-page.tsx` es la referencia canónica para:
- Estructura de tabla (border-y, sin rounded)
- Chip de tipo/categoría (neutro, baja saturación)
- Chip de estado binario (Activo: verde sobrio, Inactivo: neutro opaco)
- Jerarquía de datos en fila (principal: text-sm font-semibold, metadata: text-[11px] uppercase)
- Botones en header (rounded-lg, nunca rounded-full)
- Búsqueda con sales-field

---

## 9. ARQUITECTURA DE FRONTEND

### Regla Base

- `app/(protected)`: URLs reales de Next.js (layout, loading, error, page.tsx finos)
- `components/modules/<domain>`: pantallas operativas de dominio
- `lib`: contratos, rutas, helpers y API calls sin renderizado React

### Extensiones

- `.tsx` para todo archivo que renderiza JSX
- `.ts` para tipos, helpers, constantes, formatters
- No crear `.ts` por simetría — solo cuando más de una pantalla comparte lógica
- No agregar nuevos `.jsx` (los actuales son deuda temporal)

### Rutas Normalizadas

| Ruta Canónica | Ruta Legacy |
|---------------|-------------|
| `/cuenta` | `/account`, `/account-mockup` |
| `/panel` | `/dashboard` |
| `/inventario` | `/inventory` |
| `/ventas` | `/purchase-system` |
| `/ventas/historial` | `/transaction-history` |
| `/ventas/[saleId]` | - |

### Cómo Agregar una Página Nueva

1. Crear URL en `app/(protected)/<ruta>/page.tsx`
2. Si tiene lógica/UI propia, crear componente en `components/modules/<domain>/<name>-page.tsx`
3. Si es redirect, agregar a `legacyAppRoutes`
4. Si necesita links compartidos, agregar a `routes.ts`

### Fuente de Verdad del Esquema

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules/*`

---

## 10. COMPONENTES OPERATIVOS

### Acciones de Fila

- `AdminRowActions` para celda de acciones
- `AdminRowActionButton`: patrón `icono + texto`
- `tone="neutral"` para consulta/edición, `tone="danger"` para destructivas
- `icon-only` solo para acciones universalmente reconocibles con tooltip
- `AdminRowActionsMenu` para tablas densas (trigger: 3 puntos verticales)

### Selects

- `AdminSelectMenu` para selección simple
- `FilterDropdown` para filtros de tabla
- `OpsSelectMenu` como base reusable
- Alto máximo con scroll

### Multiselección

- `AdminMultiSelectMenu` para formularios
- `OpsMultiSelectMenu` como base
- Chips debajo resumiendo seleccionados

### Chips

- `AdminSelectionChip` para seleccionados
- `OpsSelectionChip` como base

### Checkboxes

- `AdminCheckboxField` para booleanos directos (activo/inactivo)
- `AdminCheckboxOption` para listas seleccionables (label + helper)

### Campo Readonly

- `AdminReadonlyFieldState` para valores autogenerados

### Permisos

- `RolePermissionPicker` punto único para permisos de roles
- Usa `AdminCheckboxOption`
- `Buscar + Módulo`

---

## 11. CONVENCIONES DE BACKEND

### Estructura de Módulos

```
src/modules/<module>/
  ├── *.routes.js      # Definición de rutas
  ├── *.controller.js  # Manejo de requests/responses
  ├── *.service.js     # Lógica de negocio
  └── *.repo.js        # Consultas SQL parametrizadas
```

### Configuración

- `src/config/env.js`: Validación de variables de entorno al startup
- `src/config/index.js`: Exportación de config

### Middlewares

- `src/middlewares/validate.js`: Validación Zod genérica
- `src/middlewares/auth.js`: Autenticación JWT
- `src/middlewares/permissions.js`: Verificación de permisos

### Shared

- `src/shared/db.js`: Conexión a PostgreSQL con `pg`
- `src/shared/schemas.js`: Schemas Zod para endpoints críticos
- `src/shared/errors.js`: Manejo de errores

---

## 12. API BASELINE

### Endpoints Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |

### Endpoints de Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/change-password` | Cambio de contraseña |
| GET | `/api/auth/me` | Obtener sesión actual |

### Endpoints de Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario |
| PATCH | `/api/users/:userId` | Editar usuario |

### Endpoints de Roles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/roles` | Listar roles |
| POST | `/api/roles` | Crear rol |
| PATCH | `/api/roles/:roleId` | Editar rol |

### Endpoints de Ubicaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/locations` | Listar sedes |
| POST | `/api/locations` | Crear sede |
| PATCH | `/api/locations/:locationId` | Editar sede |

### Endpoints de Catálogos (montados en `/api`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sizes` | Tallas |
| POST | `/api/sizes` | Crear talla |
| GET | `/api/colors` | Colores |
| POST | `/api/colors` | Crear color |
| GET | `/api/garment-types` | Tipos de prenda |
| POST | `/api/garment-types` | Crear tipo de prenda |
| GET | `/api/fabrics` | Telas |
| POST | `/api/fabrics` | Crear tela |
| GET | `/api/fabric-details` | Detalles de tela |
| POST | `/api/fabric-details` | Crear detalle de tela |
| GET | `/api/targets` | Targets |
| POST | `/api/targets` | Crear target |

### Endpoints de Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/styles` | Listar estilos |
| POST | `/api/styles` | Crear estilo |
| PATCH | `/api/styles/:styleId` | Editar estilo |
| GET | `/api/variants` | Listar variantes |
| POST | `/api/variants` | Crear variante |
| PATCH | `/api/variants/:variantId` | Editar variante |
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |

### Endpoints de Precios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/prices` | Listar precios |
| POST | `/api/prices` | Crear precio |
| PATCH | `/api/prices/:priceId` | Editar precio |
| GET | `/api/pricing-rules` | Listar reglas de precio |
| POST | `/api/pricing-rules` | Crear regla de precio |
| PATCH | `/api/pricing-rules/:ruleId` | Editar regla de precio |

### Endpoints de Inventario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inventory` | Listar inventario |
| POST | `/api/inventory` | Crear movimiento |

### Endpoints de Transferencias

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/transfers` | Listar transferencias |
| POST | `/api/transfers` | Crear transferencia |

### Endpoints de Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/customers` | Listar clientes |
| POST | `/api/customers` | Crear cliente |
| PATCH | `/api/customers/:customerId` | Editar cliente |

### Endpoints de Ventas (POS completo)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sales` | Listar ventas |
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales/sellable-variants` | Variantes vendibles |
| GET | `/api/sales/context` | Contexto de venta |
| GET | `/api/sales/:saleId` | Detalle de venta |
| GET | `/api/sales/:saleId/receipt` | Recibo PDF |
| GET | `/api/sales/receipts/queue` | Cola de comprobantes |
| POST | `/api/sales/:saleId/retry-receipt` | Reintentar comprobante |
| POST | `/api/sales/receipts/retry-pending` | Reintentar pendientes |

### Endpoints de Postventa

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/postsales` | Listar postventas |
| POST | `/api/postsales` | Crear cambio/devolución |
| PATCH | `/api/postsales/:exchangeId` | Editar postventa |

### Endpoints de Caja

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/cash` | Historial de caja |
| POST | `/api/cash/open` | Abrir caja |
| POST | `/api/cash/close` | Cerrar caja |
| PATCH | `/api/cash/admin` | Control admin |

### Endpoints de Dashboard y Home

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/*` | Datos de dashboard |
| GET | `/api/home/*` | Datos de inicio |

---

## 13. MÓDULOS DE NEGOCIO

### Módulos Visibles en UI

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Inicio | `/` | Página de inicio |
| Dashboard | `/panel` | Panel de indicadores |
| Administración | `/administracion` | Usuarios, Roles, Ubicaciones |
| Catálogos | `/catalogos` | Catálogos maestros |
| Clientes | `/clientes` | Gestión de clientes |
| Productos | `/productos` | Estilos y variantes |
| Precios | `/precios` | Listado, crear/editar, reglas mayoristas |
| Inventory | `/inventario` | Stock actual |
| Kardex | `/kardex` | Historial de movimientos |
| Transferencias | `/transferencias` | Transferencias de stock |
| Ventas | `/ventas` | POS full: customer picker, variant search, payments, descuentos, tipos de documento, validación de caja |
| Historial Ventas | `/ventas/historial` | Sales list con backend real |
| Postventa | `/postventa` | Exchanges and cancellations |
| Caja | `/caja` | Cash register open, close, history, admin control |
| BI | `/bi` | Business intelligence con gráficos |
| Account | `/cuenta` | Seguridad, apariencia, operación |

---

## 14. FLUJO DE PRODUCTO

### Flujo Principal

`Catálogos → Estilos → Variantes → Precios`

### Catálogos Base

- `sizes` (tallas)
- `colors` (colores)
- `garment_types` (tipos de prenda)
- `fabrics` (telas)
- `fabric_details` (detalles de tela)
- `targets` (targets)

Reglas:
- Los catálogos se consumen desde backend
- Registros inactivos no se ofrecen por defecto
- `code` es identitario y no se edita

### Styles (Estilos)

Representa el producto base. Maneja:
- `product_styles`
- `style_code` (generado por backend)
- Nombre comercial
- Tipo de prenda, tela, detalle de tela, target
- Descripción
- Estado activo

NO maneja: SKU, barcode, variantes operativas.

### Variants (Variantes)

Combinaciones operativas del style. Flujo:
1. Elegir style existente
2. Configurar tallas permitidas
3. Configurar colores permitidos
4. Guardar configuración
5. Generar variantes faltantes en lote

### SKU y Barcode

- SKU generado en backend desde `style_code` + atributos
- Barcode opcional/null en esta iteración

### Edición Segura

- Editar campos descriptivos
- Activar/desactivar antes que borrar
- NO editar campos identitarios: en Styles no se edita `style_code`, `garment_type_id`, `fabric_id`, `fabric_detail_id`; en Variants no se edita `size_id`, `color_id`, `sku`, `barcode`; en Catálogos no se edita `code`

### Tablas involucradas

- `product_styles`
- `style_sizes`
- `style_colors`
- `product_variants`
- `style_size_prices`
- `pricing_rules`

---

## 15. FLUJO DE VENTAS MVP

### Actor Principal

Vendedor interno autenticado en el sistema.

### Precondiciones

- Usuario autenticado con permiso `sales.pos`
- Sede default asignada al usuario
- Clientes base cargados
- Variantes activas con stock en la sede
- Precios vigentes para tallas vendibles

### Flujo Principal

1. Vendedor entra a "Nueva venta"
2. Sistema toma sede default del usuario
3. Vendedor busca productos/variantes disponibles
4. Agrega items a la venta
5. Sistema valida stock por item
6. Selecciona cliente (existente o genérico de mostrador)
7. Sistema calcula precio vigente desde backend
8. Define método de pago
9. Sistema registra venta en una sola operación
10. Venta queda confirmada y genera:
    - Cabecera en `sales`
    - Líneas en `sales_details`
    - Pago en `sales_payments`
    - Salida en `stock_movements`
11. Vendedor ve confirmación con identificador

### Estados

**UI:** Edición → Validando → Confirmada → Error
**BD:** La venta nace y termina como `confirmed` (draft/cancelled para iteración posterior)

### Validaciones Mínimas

- Usuario debe tener sede default
- Variante debe existir y estar activa
- Cantidad > 0
- Stock suficiente en sede
- Precio vigente aplicable
- Toda venta confirmada debe persistir `customer_id`
- Total calculado por backend consistente con items
- Monto de pago debe cubrir total
- Método de pago en set permitido

### Casos Permitidos MVP

- Venta con cliente retail existente
- Venta con cliente genérico de mostrador
- Venta con un solo método de pago
- Venta con uno o varios items

### Casos Fuera de MVP

- Mezcla de varios pagos
- Descuento manual
- Override de precio
- Reserva sin confirmación
- Anulación posterior
- Cambio o devolución
- Cierre diario end-to-end

### Contrato Técnico Mínimo

`POST /api/sales` recibe: `customer_id`, `document_type`, `payment_method`, `notes?`, `items[{variant_id, quantity}]`

La sede, vendedor, snapshots de cliente y precio final los resuelve backend.

### Contingencia SUNAT

Endpoints disponibles (requieren auth y permiso `sales.pos`):
- `GET /api/sales/receipts/queue?queue_status=open&limit=50`
- `POST /api/sales/:saleId/retry-receipt`
- `POST /api/sales/receipts/retry-pending` con body opcional `{ "limit": 20 }`

Valores de `queue_status`: `open` (missing+pending+error), `missing`, `pending`, `error`, `all`.

---

## 16. FLUJO DE CAJA

### Objetivo

Definir comportamiento mínimo de apertura y cierre de caja por sede y fecha.

### Roles Autorizados

- `ADMIN`
- `CAJA`

### Contexto Operativo

- Sede operativa: sede default del usuario autenticado
- Fecha de negocio: `America/Lima`
- Solo una caja por `location_id + business_date`

### Estados

- `open`: Caja abierta
- `closed`: Caja cerrada

### Apertura

1. Usuario autorizado entra a Caja
2. Si no existe caja para su sede+fecha, puede abrirla
3. Crea registro en `cash_closings` con estado `open`
4. Si ya existe caja `open`, se reutiliza
5. Si ya existe caja `closed`, se rechaza con 409

### Cierre

1. Solo caja `open` puede cerrarse
2. Calcula totales del día usando ventas `confirmed` + `sales_payments`
3. Persiste totales por método en `cash_closings`
4. Caja queda en estado `closed`

### Totales por Método

- `cash`, `yape`, `plin`, `transfer`, total general
- Solo ventas de sede activa, status `confirmed`, fecha Lima coincide

### Restricciones

- Usuario sin sede default no puede abrir caja
- Rol no autorizado → 403
- Caja cerrada no puede volver a cerrarse
- Caja de otra sede no puede consultarse/cerrarse

### Queries de Referencia

**Ventas confirmadas por sede y fecha:**
```sql
select l.code, timezone('America/Lima', s.confirmed_at)::date as business_date,
  s.sale_number, s.document_type, s.total_amount
from sales s inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed' and l.code = 'TD-CENT'
order by business_date desc, s.confirmed_at desc;
```

**Agregado por método de pago:**
```sql
select l.code, timezone('America/Lima', s.confirmed_at)::date as business_date,
  coalesce(sum(case when sp.method = 'cash' then sp.amount else 0 end), 0)::numeric(12,2) as total_cash,
  coalesce(sum(case when sp.method = 'yape' then sp.amount else 0 end), 0)::numeric(12,2) as total_yape,
  coalesce(sum(case when sp.method = 'plin' then sp.amount else 0 end), 0)::numeric(12,2) as total_plin,
  coalesce(sum(case when sp.method = 'transfer' then sp.amount else 0 end), 0)::numeric(12,2) as total_transfer,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as total_all
from sales s inner join sales_payments sp on sp.sale_id = s.sale_id
inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed' and l.code = 'TD-CENT'
group by l.code, timezone('America/Lima', s.confirmed_at)::date
order by business_date desc;
```

**Consistencia cabecera vs pagos:**
```sql
select s.sale_number, s.total_amount,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as payment_total,
  (s.total_amount - coalesce(sum(sp.amount), 0))::numeric(12,2) as difference
from sales s left join sales_payments sp on sp.sale_id = s.sale_id
where s.status = 'confirmed'
group by s.sale_number, s.total_amount
order by s.sale_number asc;
```

### Dataset Recomendado (orden)

1. `database/seed_access_control.sql`
2. `database/seed_operational_demo.sql`
3. `database/seed_variants_inventory.sql`
4. `database/seed_style_size_prices.sql`
5. `database/seed_sales_mvp.sql`
6. `database/seed_sales_confirmed_demo.sql`
7. `database/readiness_sales_mvp.sql`

---

## 17. SISTEMA DE PERMISOS Y ROLES

### Tablas Involucradas

- `roles`: role_id, name (ADMIN, TIENDA, CAJA, VENTAS, ALMACEN), description, active
- `permissions`: permission_id, key, description
- `role_permissions`: role_id, permission_id (PK compuesta)

### Permisos Disponibles

| Clave | Descripción |
|-------|-------------|
| `admin.manage` | Administración: roles, usuarios, ubicaciones |
| `catalogs.manage` | Catálogos maestros |
| `products.manage` | Estilos y variantes |
| `prices.manage` | Precios y reglas comerciales |
| `transfers.manage` | Transferencias de stock |
| `inventory.view` | Inventario y kardex |
| `sales.pos` | Venta rápida / compra |

### Matriz de Roles y Permisos

| Rol | admin.manage | catalogs.manage | products.manage | prices.manage | transfers.manage | inventory.view | sales.pos |
|-----|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TIENDA** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **CAJA** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **VENTAS** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **ALMACEN** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

### Sidebar por Rol

**ADMIN:** Todo
**TIENDA:** Catálogos, Productos, Precios, Compra, Inventario
**CAJA:** Solo "Venta Rápida"
**VENTAS:** Productos, Precios, Compra
**ALMACEN:** Transferencias, Inventario

### Flujo de Autenticación

1. Login → backend obtiene permisos desde `role_permissions`
2. Token JWT incluye: `sub`, `role_id`, `role_name`, `permissions[]`
3. Frontend `AuthProvider` expone: `user`, `permissions`, `has(key)`
4. Sidebar filtra por permiso base, `onlyForRoles`, `excludeRoles`

### Hook usePermissions

```typescript
import { usePermissions } from "@/hooks/usePermissions"
// Métodos: hasPermission, hasAnyPermission, hasAllPermissions,
// hasRole, hasAnyRole, canAccessQuickSale, canAccessAdministration,
// canAccessCatalogs, canAccessTransfers, canAccessInventory
```

### Seguridad

- Frontend filtra UI (experiencia)
- Backend valida permisos (seguridad) con middleware `checkPermission`
- Database: RLS en Supabase si es necesario

---

## 18. SEGURIDAD BACKEND

### Validación de Variables de Entorno

`validateEnv()` en `apps/backend/src/config/env.js` verifica `DATABASE_URL` y `JWT_SECRET` al startup. Si falta alguna, termina con `process.exit(1)`.

### Helmet (Headers de Seguridad HTTP)

Middleware global en `app.js`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-XSS-Protection: 0` (se prefiere CSP)
- `Referrer-Policy: no-referrer`

### Rate Limiting

- Global: 20 requests por 15 minutos en login
- Body size limit: 1mb

### Validación de Schemas con Zod

Middleware genérico `validate(schema, source)` en `apps/backend/src/middlewares/validate.js`.

Schemas definidos en `apps/backend/src/shared/schemas.js`:
- `login`: username + password requeridos
- `createUser`: full_name, username, role_id (UUID), assignments (array)
- `patchUser`: todos opcionales
- `createCustomer`: document_type enum, customer_type enum
- `patchCustomer`: todos opcionales
- `createSale`: document_type enum, payment_method enum, items array

### SQL Injection

Todos los `.repo.js` usan consultas parametrizadas con `$N` placeholders via `pg`. Zod agrega capa adicional de validación.

### Tests de Seguridad

24 tests en `apps/backend/src/__tests__/security.test.js` (node:test):
- Suite 1: Zod schema validation (unit) — SQL injection, casos de rechazo
- Suite 2: Validation middleware (integration) — 400 vs 200
- Suite 3: Rate limiter (integration) — 5 éxitos, 6to bloqueado (429)
- Suite 4: Helmet headers (integration) — verifica headers presentes

---

## 19. WORKFLOW BACKEND Y SUPABASE

### Fuente de Verdad

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules`

La base remota en Supabase es el entorno activo, pero la definición del esquema debe quedar versionada en SQL dentro del repo.

### Diferencia entre Migración, Seed y CRUD

| Tipo | Descripción | Regla |
|------|-------------|-------|
| **Migración** | Cambio estructural (tabla, columna, constraint, índice) | Primero crear migración SQL, luego aplicar al entorno, versionar en repo |
| **Seed** | Inserción de datos base (tallas, colores, roles, demo) | Seeds pequeños e idempotentes, solo lo necesario |
| **CRUD** | Operación normal sobre tablas existentes | Crear, listar, editar, activar/desactivar |

### Política de Códigos

- Backend genera códigos por defecto
- Frontend solo muestra preview o permite override puntual
- Validación de formato y unicidad vive en backend
- `locations.code`: prefijo por tipo + nombre + sufijo incremental
- Catálogos con `code`: corto, único, mayúsculas
- `product_styles.style_code`: generado por backend
- `product_variants.sku`: derivado de `style_code` + atributos
- `users`: en v1 se usa `email` como identificador

### Orden Técnico Recomendado

1. Ubicaciones
2. Catálogos
3. Roles
4. Usuarios
5. Estilos
6. Variantes
7. Precios
8. Inventario
9. Transferencias
10. Ventas

### Regla Importante

El frontend NO debe hablar directo con Supabase para operaciones del ERP. La app consume backend, y el backend usa SQL explícito sobre PostgreSQL.

---

## 20. TESTING

### Testing de Ventas MVP

**Prerrequisitos:** Ejecutar seeds de acceso, operacional, variantes, precios, ventas MVP y ventas confirmadas demo.

**Casos felices:**
1. Venta retail simple: login → nueva venta → seleccionar estilo + talla/color → agregar cantidad → seleccionar cliente → método de pago → confirmar
2. Resultado esperado: venta registrada, número visible, stock baja, movimiento en kardex

**Casos borde:**
1. Sin stock suficiente → backend rechaza, UI muestra error, no hay venta parcial
2. Sin precio vigente → backend rechaza, no se registra
3. Venta fuera de sede permitida → backend no devuelve ventas ajenas
4. Cliente inválido → backend rechaza
5. Pago inválido → backend rechaza

**Validaciones cruzadas post-venta:** `sales`, `sales_details`, `sales_payments`, `stock_movements`, `inventory`

### Testing de Permisos

Verificar matriz de roles y permisos, login con cada rol, sidebar filtrado, API `/api/auth/me`, hook `usePermissions`, y protección de rutas.

### Testing de Seguridad

Ejecutar `npm test` en `apps/backend` para 24 tests de seguridad (Zod, rate limiter, helmet).

---

## 21. PRIORIDADES SIGUIENTES

1. **Hardening de ventas:** Edge cases del POS (descuentos complejos, validaciones de stock, flujo de recibos)
2. **Caja y cierres:** Integración completa de cash closing con ventas, arqueos y reportes
3. **Reportes y BI:** Expandir analytics más allá del dashboard actual
4. **Permisos granulares:** Refinar permisos por ubicación y rol en flujos críticos
5. **Testing end-to-end:** Flujos críticos (venta, caja, transferencias)
6. **Optimización y pulido:** Rendimiento, UX density, temas, carga de assets

---

## 22. DOCUMENTACIÓN TÉCNICA

| Documento | Descripción |
|-----------|-------------|
| `backend-supabase-workflow.md` | Workflow backend + Supabase |
| `supabase-team-access.md` | Acceso del equipo a Supabase |
| `product-flow.md` | Flujo de producto |
| `sales-mvp-scope.md` | Scope de Ventas MVP Semana 9 |
| `sales-flow.md` | Flujo funcional de ventas |
| `sales-readiness-check.md` | Readiness check de ventas |
| `testing-sales.md` | Testing manual de ventas |
| `sales-history-detail-validation.md` | Validación de historial y detalle |
| `cash-mvp-flow.md` | Flujo funcional de caja MVP |
| `cash-closing-base.md` | Base técnica para caja y cierre diario |
| `permisos-roles-sidebar.md` | Sistema de permisos y roles |
| `testing-permisos.md` | Testing del sistema de permisos |
| `seguridad-backend.md` | Seguridad backend |
| `frontend-page-standard.md` | Estándar de páginas frontend |
| `frontend-architecture-standard.md` | Estándar de arquitectura frontend |
| `frontend-ui-ux-operativo.md` | UI/UX operativo |
| `frontend-ui-ux-considerations.md` | Consideraciones UI/UX |
| `frontend-operational-components.md` | Componentes operativos frontend |
| `changes_2026-04-23.md` | Cambios realizados 2026-04-23 |

---

> Fin del documento consolidado.  
> Generado a partir de: README.md, AGENTS.md, DESIGN.md, apps/frontend/README.md, y todos los archivos en docs/
