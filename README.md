# RIPNEL Platform — MVP

ERP enfocado en inventario, ventas, precios y transferencias internas. Arquitectura portable: frontend separado, backend con lógica de negocio, PostgreSQL administrado en Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-43853D?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-1F2937?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## Arquitectura del proyecto

```
ripnel-platform/
├── apps/
│   ├── frontend/              # Next.js 16 — App Router, Tailwind 4, shadcn/ui
│   │   ├── app/               # Rutas y layouts (protegidas, públicas)
│   │   ├── components/        # UI, módulos, layout, chatbot
│   │   │   ├── modules/       # Páginas de cada módulo (sales, transfers, home, etc.)
│   │   │   ├── home/          # Componentes del inicio
│   │   │   ├── sidebar/       # Sidebar + topbar
│   │   │   ├── ui/            # shadcn/ui + componentes operativos
│   │   │   └── chatbot/       # Cliente del chatbot (ChatbotLazy wrapper)
│   │   ├── lib/               # Utilidades, API client, rutas
│   │   └── public/            # Assets estáticos
│   └── backend/               # Node.js + Express, CommonJS
│       └── src/
│           ├── config/        # env.js, configuración
│           ├── middlewares/    # Auth, error handler, validación
│           ├── modules/       # auth, users, roles, locations, catalogs,
│           │                  # styles, variants, prices, pricing-rules,
│           │                  # inventory, transfers, customers, sales,
│           │                  # postsales, cash, dashboard, home, products,
│           │                  # notifications, chatbot
│           └── shared/        # db (pg pool), schemas (zod), errors, email
├── database/                  # Snapshots y scripts SQL de referencia
├── supabase/                  # Migraciones, seed data
└── docs/                      # Documentación técnica
```

### Reglas de arquitectura

- Frontend llama backend para operaciones ERP. No conecta directo a tablas.
- Backend trata Supabase como PostgreSQL administrado. No usa `supabase-js` como foundation.
- SQL explícito con `pg`, sin ORM.
- CommonJS en backend.
- Módulos pequeños y específicos (routes, controller, service, repo).

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| UI | shadcn/ui, Radix UI primitives, lucide-react |
| Tablas | @tanstack/react-table |
| Formularios | react-day-picker, date-fns |
| Drag & drop | @dnd-kit |
| Notificaciones | sonner |
| Backend | Node.js 22, Express 5 |
| Base de datos | PostgreSQL 17 via `pg` + Supabase |
| PDF | @react-pdf/renderer |
| Email | nodemailer (SMTP) |
| IA | Google Generative AI (Gemini 2.5 Flash) |
| Cache semántico | text-embedding-004 |

---

## Inicio rápido

```bash
npm install
# Terminal 1:
npm run dev:backend    # http://localhost:3001
# Terminal 2:
npm run dev:frontend   # http://localhost:3000
```

### Variables de entorno

**Backend** — `apps/backend/.env`:

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del servidor (default 3001) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `FRONTEND_URL` | Origen del frontend para CORS |
| `GEMINI_API_KEY` | API key de Google AI para chatbot |
| `SMTP_HOST` | Servidor SMTP para envío de correos |
| `SMTP_PORT` | Puerto SMTP |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP |
| `SMTP_FROM` | Dirección remitente |

**Frontend** — `apps/frontend/.env.local`:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | URL base del backend API |

---

## Módulos del sistema

### Módulos operativos

| Módulo | Ruta frontend | Endpoints API |
| --- | --- | --- |
| Inicio | `/` | `GET /api/home/overview` |
| Dashboard | `/dashboard` | `GET /api/dashboard/*` |
| Ventas (POS) | `/ventas` | `GET/POST /api/sales/*` |
| Historial de Ventas | `/historial-ventas` | `GET /api/sales` |
| Postventa | `/postventa` | `GET/POST/PATCH /api/postsales/*` |
| Caja | `/caja` | `GET/POST/PATCH /api/cash/*` |
| Transferencias | `/transferencias` | `GET/POST /api/transfers/*` |
| Inventario | `/inventario` | `GET/POST /api/inventory/*` |
| Productos | `/productos` | `GET/POST /api/products/*` |
| Precios | `/precios` | `GET/POST/PATCH /api/prices/*`, `/api/pricing-rules/*` |
| Clientes | `/clientes` | `GET/POST/PATCH /api/customers/*` |
| BI | `/bi` | Reportes y gráficos nativos |
| Chatbot | Widget en layout | `POST /api/chatbot/*` |

### Módulos de administración

| Módulo | Ruta frontend | Endpoints API |
| --- | --- | --- |
| Usuarios | `/admin/usuarios` | `GET/POST/PATCH /api/users/*` |
| Roles | `/admin/roles` | `GET/POST/PATCH /api/roles/*` |
| Ubicaciones | `/admin/ubicaciones` | `GET/POST/PATCH /api/locations/*` |
| Catálogos | `/admin/catalogos` | Tallas, colores, tipos de prenda, telas |

---

## Flujo de ventas (POS)

1. El operador abre la caja del día en Caja.
2. Desde Ventas, selecciona tipo de comprobante y cliente.
3. Busca variantes por SKU/código, selecciona talla/color, define cantidad.
4. Aplica descuento general (% o monto fijo).
5. Define método de pago (único o mixto: efectivo, Yape, Plin, transferencia).
6. Confirma la venta → descuenta stock, registra movimiento, genera comprobante.
7. Acciones post-venta: imprimir, enviar por correo, descargar PDF, ir a detalle.

### Reglas de negocio

- `document_type`: `none`, `proforma`, `boleta`, `factura`.
- `boleta` requiere cliente con DNI o CE.
- `factura` requiere cliente con RUC y dirección fiscal.
- El backend valida stock, precio vigente, caja abierta y consistencia de pagos.
- IGV: 18% para boleta y factura, 0% para proforma y sin comprobante.
- Descuento general por porcentaje (máx 100%) o monto fijo (máx total venta).
- Precio mayorista se activa al alcanzar el umbral configurado en `pricing_rules`.

---

## Diseño y UX

Ver `DESIGN.md` y `docs/` para guías detalladas. Principios clave:

- Violeta `#b07ae4` como color primario de acción.
- Densidad operativa: tablas compactas, controles pequeños, sin whitespace decorativo.
- Poppins como tipografía principal.
- Tooltips para ayuda contextual en vez de texto explicativo persistente.

---

## Documentación técnica

- [Workflow Backend + Supabase](./docs/backend-supabase-workflow.md)
- [Acceso del equipo a Supabase](./docs/supabase-team-access.md)
- [Sistema de diseno](./DESIGN.md)
- [Estandar de paginas frontend](./docs/frontend-page-standard.md)
- [Criterios UI/UX operativos](./docs/frontend-ui-ux-operativo.md)
- [Flujo de producto](./docs/product-flow.md)
- [Scope de Ventas MVP](./docs/sales-mvp-scope.md)
- [Flujo funcional de ventas](./docs/sales-flow.md)
- [Testing manual de ventas](./docs/testing-sales.md)
- [Readiness check de ventas](./docs/sales-readiness-check.md)
- [Estándar de página frontend](./docs/frontend-page-standard.md)
- [Criterios UI/UX operativos](./docs/frontend-ui-ux-operativo.md)

---

## Changelog

### 2026-06-20 — Auditoría P0/P1, dark mode, PermissionGuard, consistencia UI

#### Seguridad — PermissionGuard en 27 rutas

Se agregó `PermissionGuard` en todas las rutas de página Next.js que carecían de protección client-side. El backend ya validaba permisos, pero ahora el frontend también bloquea acceso visual:

| Permiso | Rutas protegidas |
|---------|-----------------|
| `sales.pos` | `/ventas`, `/ventas/[saleId]`, `/ventas/historial` |
| `sales.postsale.view` | `/postventa`, `/postventa/[saleId]` |
| `cash.view` / `cash.operate` | `/caja` (`anyPermissions`), `/caja/historial`, `/caja/historial/[id]` |
| `cash.admin.view` | `/caja/control` |
| `customers.manage` | `/clientes` |
| `inventory.view` | `/inventario`, `/inventario/[styleId]`, `/inventario/movimientos`, `/inventario/ajustes` |
| `transfers.manage` / `transfers.request.view_own` | `/transferencias`, `/transferencias/[transferId]`, `/transferencias/historial` (`anyPermissions`) |
| `transfers.manage` / `transfers.receive` | `/transferencias/recepciones` (`anyPermissions`) |
| `catalogs.manage` | `/catalogos`, `/catalogos/[catalogId]`, `/catalogos/[catalogId]/nuevo` |
| `products.manage` | `/productos`, `/productos/[productId]`, `/productos/nuevo` |
| `prices.manage` | `/precios`, `/precios/reglas`, `/precios/crear` |

#### Dark mode — migración a tokens ops-tone

Archivos que usaban colores Tailwind hardcoded (`text-amber-*`, `bg-emerald-*`, `border-rose-*`, etc.) sin variantes `dark:` fueron migrados a variables CSS `var(--ops-tone-*)`:

| Archivo | Cambio |
|---------|--------|
| `cash/cash-page.tsx` | `border-emerald-*` → `var(--ops-tone-success-border)`, `text-amber-*` → `var(--ops-tone-warning-text)` |
| `cash/cash-control-page.tsx` | `text-amber-700/800`, `text-emerald-700` → tokens correspondientes |
| `cash/cash-history-detail-page.tsx` | `border-amber-*`/`border-emerald-*` → tokens de warning/success |
| `shared/module-placeholder.tsx` | Reescrito completamente: `slate-*`, `violet-*` → `var(--ops-*)` y `var(--ripnel-accent)` |
| `customers/customers-powerbi-dashboard-page.tsx` | Reescrito: `gray-*`, `blue-*`, `amber-*` → tokens ops + OpsPageShell + PosHeader |
| `feedback/status-page.tsx` | `defaultToneClasses` con `dark:` variants; fondo del section con `dark:` gradient; botones con `dark:` |
| `sales/pos/pos-page.tsx` | `text-amber-500` → `var(--ops-tone-warning-text)`; `border-rose-*`/`bg-rose-*` → `var(--ops-tone-danger-*)` |
| `chatbot/ChatbotWidget.tsx` | Agregadas variantes `dark:` faltantes en botones, labels, loading dots, conversation title |

#### Consistencia UI — OpsPageShell

| Página | Antes | Después |
|--------|-------|---------|
| `prices-workspace-page.tsx` | Wrapper manual | `<OpsPageShell width="wide">` |
| `pricing-rules-page.tsx` | Wrapper manual | `<OpsPageShell width="wide">` |
| `transaction-history-page.tsx` | `ops-page min-h-screen` + `max-w-[1180px]` manual | `<OpsPageShell width="wide">` |
| `customers-powerbi-dashboard-page.tsx` | Sección sin shell | `<OpsPageShell width="wide">` + `PosHeader` |

#### Consistencia UI — TooltipProvider

| Página | Cambio |
|--------|--------|
| `transfers-manage-page.tsx` | Agregado `<TooltipProvider delayDuration={120}>` wrapper |

#### TypeScript — corrección de errores

| Archivo | Issue | Fix |
|---------|-------|-----|
| `inventory-adjustments-create-page.tsx` | Acceso a `detail.status`, `detail.location_id` etc. sobre tipo `AdjustmentDetailData` (que envuelve `{ adjustment, meta }`) | Desestructurar: `const { adjustment } = ...`; acceder vía `adjustment.status`, `adjustment.location_id` |
| `inventory-adjustments-create-page.tsx` | `tone="info"` no es valor válido de `StatusTone` | Cambiado a `tone="neutral"` |
| `administration/users-page.tsx` | `useMemo` usaba `userForm` y `selectedLocationIds` antes de su declaración | Movidos `useState` antes de los `useMemo` dependientes |

#### window.confirm → AdminConfirmModal

- `postsale-detail-page.tsx`: Reemplazado `window.confirm` por `<AdminConfirmModal>`. El botón de cancelación ahora abre el modal; el modal confirma la acción asíncrona.

#### Seguridad — backend routes

- `catalogs.routes.js`, `styles.routes.js`, `variants.routes.js`: Agregado `requireAuth` + `requirePermission` en todas las rutas.
- `users.routes.js`: Validación Zod (`userAssignments` schema) en `PUT /:userId/locations`.
- Rate limiter global: 200 req/min configurado en `app.js`.

#### Performance — backend

- `sales.service.js`: `createSale` refactorizado de N+1 queries a batch queries (6-7N → 6 queries totales).
- `dashboard.service.js`: Overview + activity secuenciales → `Promise.all`.
- `dashboard.repo.js`: `findTransferPendingData` combinado de 2 llamadas a 1.
- `inventory.service.js`/`repo.js`: Paginación server-side (`LIMIT`/`OFFSET` + `COUNT`), backward-compatible.
- Frontend: Dynamic imports para recharts y POS stages.

### 2026-06-08 — Auditoría completa, hardening UX, feedback unificado, CSV export

#### Infraestructura nueva

- **`lib/toast.ts`**: Wrapper unificado sobre `sonner` (`showSuccess`, `showError`, `showWarning`, `showInfo`) con duración y formato consistentes.
- **`hooks/use-keyboard-shortcut.ts`**: `useKeyboardShortcut` (atajo individual) y `useKeyboardShortcuts` (múltiples atajos con soporte Ctrl/Alt/Shift, ignora inputs).
- **`hooks/use-debounce.ts`**: `useDebounce<T>` genérico con delay configurable (default 300ms).
- **`lib/export-csv.ts`**: `exportToCsv(filename, headers, rows)` — genera CSV con escaping de comillas/comas y descarga automática.
- **`components/ui/export-csv-button.tsx`**: Botón reutilizable de exportación CSV con tooltip y estado disabled.
- **`components/ui/command-palette.tsx`**: Buscador global de módulos con `Ctrl+K`. Navegación con flechas ↑↓ y Enter, filtrado por nombre y keywords, backdrop con blur.

#### Global

- **`app/layout.tsx`**: Agregado `<Toaster>` de sonner (`richColors`, `closeButton`, `position="top-right"`, tipografía Poppins).
- **`app/(protected)/layout.tsx`**: `<ErrorBoundary>` global envolviendo todo el contenido protegido + `<CommandPalette>` para `Ctrl+K`.

#### Sidebar

- **Logo**: `href="/demo"` → `href={appRoutes.home}` (apunta a `/inicio`).
- **Typo**: `Cerrar sesion` → `Cerrar sesión`.
- **Íconos redundantes**: Eliminados 4 íconos `ArrowLeftRight` duplicados en los ítems del submenú Transferencias (`sidebar-config.ts`).

#### POS (Ventas) — `pos-page.tsx`

- **Protección anti-pérdida**: `beforeunload` se activa cuando `cart.length > 0`, previniendo cierre accidental de pestaña.
- **Atajos de teclado**: `F2` → buscar producto, `F4` → buscar cliente, `F8` → confirmar venta, `Esc` → cerrar pickers abiertos.
- **Toast**: éxito al confirmar venta (`showSuccess` con número de venta), error con mensaje del backend.

#### Dashboard

- KPIs (`DashboardKpiCard` → `OpsMetricCard`) ya eran cliqueables con `href`. Verificado que todos los KPIs y filas de atención navegan a sus páginas de detalle correspondientes.

#### Unificación de feedback a toasts

| Módulo | Antes | Ahora |
|--------|-------|-------|
| **Caja** (`cash-page.tsx`) | `setActionError` + inline `InlineStatusCard` | `showSuccess`/`showError` en abrir/cerrar caja |
| **Clientes** (`customers-page.tsx`) | `setSaveError` + inline, sin debounce | `showSuccess`/`showError` + `useDebounce(300ms)` en búsqueda |
| **Transferencias** (`transfers-list-page.tsx`) | `setActionError`/`setNotice` inline | `showSuccess`/`showError` en aprobar/despachar/recibir/cancelar |
| **Catálogos** (`catalog-crud-page.tsx`) | `setMutationError`/`setEditError`/`setSuccessMessage` inline | `showSuccess`/`showError` en toggle y edición |

#### Refactor de Historial de Ventas (`transaction-history-page.tsx`)

- Migrado de `useEffect` + `AbortController` + `setTimeout` manual al hook estandarizado `useApiGet`.
- Agregado `useDebounce` para búsqueda (300ms).
- Eliminado import innecesario `formatApiFetchError`.
- Reducción de ~45 líneas de boilerplate.

#### CSV Export en tablas principales

| Página | Archivo | Columnas |
|--------|---------|----------|
| `/ventas/historial` | `ventas.csv` | Nro, Cliente, Estado, Tipo Doc, Subtotal, Descuento, Total, Vendedor, Sede, Fecha |
| `/inventario` | `stock-por-producto.csv` / `stock-por-sede.csv` | Según pestaña activa (producto/sede) |
| `/transferencias` | `transferencias.csv` | Nro, Origen, Destino, Estado, Flujo, Solicitadas, Enviadas, Acción, Fecha |
| `/clientes` | `clientes.csv` | Código, Nombre, Tipo Doc, Nro Doc, Razón Social, Tipo, Email, Teléfono, Activo, Creado |
| `/inventario/movimientos` (Kardex) | `kardex.csv` | SKU, Producto, Sede, Tipo, Cantidad, Efecto, Saldo, Origen, Referencia, Usuario, Fecha |
| `/catalogos/*` | `[tipo].csv` | Código, Nombre, campos dinámicos + Activo |

#### Inicio (Home) — `home-page.tsx` + `home-transfer-requests.tsx`

- **Transferencias entre tiendas**: Simplificado de ~70 líneas con doble jerarquía y métricas duplicadas a ~25 líneas limpias.
- `HomeTransferRequests`: Eliminado wrapper `HomeSectionCard` (evitaba header anidado "Transferencias / Solicitudes entre tiendas"). Contadores grandes reemplazados por `OpsMetricStripItem` compactos. Lista de ítems como rows finas con chip de estado + ruta + fecha. Empty state simplificado.

### 2026-06-07 — Receipt buttons, descuento fijo, chatbot, sales history

#### Backend — Nuevo

- **`src/shared/email.js`**: Servicio de envío de correos con nodemailer (SMTP desde `.env`). Función `sendReceiptEmail()` con adjunto PDF.
- **`POST /api/sales/:saleId/send-email`**: Genera PDF del comprobante y lo envía al email registrado del cliente.
- **`GET /api/sales/:saleId/receipt-pdf`**: Genera PDF para cualquier tipo de documento (boleta, factura, proforma), no solo proforma.
- Variables SMTP agregadas a `src/config/env.js` (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFrom`).
- Dependencia: `nodemailer` instalada.

#### Backend — Modificado

- **`sales.repo.js`**: `findSaleById` ahora hace `LEFT JOIN customers` para incluir `customer_email`.
- **`sales.service.js`**: `getSaleProformaPdf` eliminó la restricción de solo proforma, ahora retorna `customerEmail` y `saleNumber`.
- **`sales-proforma-pdf.js`**: Título dinámico según `sale._label` (PROFORMA / COMPROBANTE).
- **`chatbot.service.js`**: Agregadas funciones `calculate` (suma, resta, multiplicación, división) y `get_sales_by_date_range` (resumen de ventas entre fechas).

#### Frontend — POS

- **Botón "Agregar"**: ahora `w-full` con `shadow-sm` para mayor visibilidad.
- **Descuento general**: agregado toggle % / S/. (monto fijo) con validación independiente para cada modo.
- **"Finalizar venta"**: agregado icono `<Check>` antes del label.
- **Flujo post-confirmación**: después de confirmar, el panel de resumen permanece visible (`activeStage = "summary"`) para que los botones de recibo estén habilitados y visibles.
- **Botón "Nueva venta"**: aparece después de confirmar, resetea el estado completo para empezar otra venta.
- **Botones de acciones**:
  - *Imprimir comprobante*: abre PDF en nueva ventana y dispara `window.print()`.
  - *Enviar por correo*: llama `POST /api/sales/:id/send-email`.
  - *Descargar PDF*: usa `receipt-pdf` endpoint con `download` attribute.
  - *Guardar como borrador*: redirige a `/ventas/:id` (detalle de venta).
- `SaleDiscountState.mode` extendido a `'percent' | 'fixed'` (en `pos-types.ts`).
- `computeSaleDiscountAmount` soporta modo `fixed` con tope en el subtotal.

#### Frontend — Historial de Ventas

- Botón "Postventa" más grande (`size="default"` + `font-semibold shadow-sm`).
- Botón "CONTINUAR VENTA" en esquema de color amber (warning) para drafts.
- Atajo de fechas "Este mes" agregado a los filtros rápidos.

#### Frontend — Otros

- **Logo**: agregado `style={{ width: "auto", height: "auto" }}` en `login.tsx` y `AppSidebar.tsx` para eliminar warning de aspecto en Next.js Image.

### 2026-05-XX — Lighthouse, contraste, chatbot fixes

- Chatbot: tools format corregido para Gemini SDK v0.21.0 (`[{ functionDeclarations: TOOLS }]`).
- Error handler: `err.status` como fallback para status codes de Google AI SDK.
- Chatbot: columnas SQL corregidas (`sd.qty` → `sd.quantity`, `sd.total_price` → `sd.line_total`).
- Layout: `ChatbotWidget` movido a `next/dynamic` con `ssr:false` via wrapper `ChatbotLazy`.
- Contraste: `--ops-text-muted` (#72687f → #5b5168) y `--muted-foreground` (#6f6f6f → #575757) en todos los themes.

### 2026-04-23 — CI, ESLint, pricing rules

- Pipeline CI en `.github/workflows/ci.yml`.
- Correcciones de ESLint (`react-hooks/set-state-in-effect`) en páginas de BI, kardex, postventa, POS.
- Backend: módulo `pricing-rules` con CRUD real (`GET/POST/PATCH /api/pricing-rules`).
- Frontend: `list-prices.tsx` conectado a API real de reglas de precio.

---

## Notas de ventas

- `document_type` es un dato comercial interno (`none`, `proforma`, `boleta`, `factura`).
- El backend no emite comprobantes externos ni expone colas de emisión.
- `sales_receipts` queda como legado de BD fuera del flujo activo.
